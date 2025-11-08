from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import List, Optional
import logging

from app.models.schemas import (
    AttendanceStatsResponse, AttendanceLogQuery, AttendanceLogResponse,
    AttendanceRecord, UserResponse, NetworkRequirements
)
from app.routers.auth import get_current_user
from app.core.database import get_admin_db
from app.services.network_verification import network_verification_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/stats", response_model=AttendanceStatsResponse)
async def get_attendance_statistics(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get comprehensive attendance statistics
    Note: In a real system, you might want to restrict this to admin users only
    """
    try:
        db_admin = get_admin_db()
        
        # Calculate date ranges
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        
        # Total users
        users_result = db_admin.table("users").select("id", count="exact").eq("is_active", True).execute()
        total_users = users_result.count or 0
        
        # Today's attendance
        today_attendance = db_admin.table("attendance")\
            .select("id", count="exact")\
            .gte("timestamp", today.isoformat())\
            .execute()
        total_attendance_today = today_attendance.count or 0
        
        # This week's attendance
        week_attendance = db_admin.table("attendance")\
            .select("id", count="exact")\
            .gte("timestamp", week_start.isoformat())\
            .execute()
        total_attendance_week = week_attendance.count or 0
        
        # This month's attendance
        month_attendance = db_admin.table("attendance")\
            .select("id", count="exact")\
            .gte("timestamp", month_start.isoformat())\
            .execute()
        total_attendance_month = month_attendance.count or 0
        
        # Success rates and averages
        all_records = db_admin.table("attendance")\
            .select("confidence_score, location_verified")\
            .gte("timestamp", month_start.isoformat())\
            .execute()
        
        records = all_records.data or []
        
        if records:
            avg_confidence = sum(r["confidence_score"] for r in records) / len(records)
            verification_success_rate = sum(1 for r in records if r["location_verified"]) / len(records)
            network_verification_rate = verification_success_rate  # Same for now
        else:
            avg_confidence = 0.0
            verification_success_rate = 0.0
            network_verification_rate = 0.0
        
        return AttendanceStatsResponse(
            total_users=total_users,
            total_attendance_today=total_attendance_today,
            total_attendance_this_week=total_attendance_week,
            total_attendance_this_month=total_attendance_month,
            verification_success_rate=verification_success_rate,
            average_confidence_score=avg_confidence,
            network_verification_rate=network_verification_rate
        )
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

@router.get("/attendance-logs", response_model=AttendanceLogResponse)
async def get_attendance_logs(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    student_id: Optional[str] = Query(None, description="Filter by student ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    limit: int = Query(50, ge=1, le=1000, description="Number of records per page"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get attendance logs with filtering options
    """
    try:
        db_admin = get_admin_db()
        
        # Build query
        query = db_admin.table("attendance")\
            .select("""
                id, user_id, timestamp, location_verified, network_ssid, 
                confidence_score, liveness_passed, device_ip,
                users(student_id, full_name, department)
            """)\
            .order("timestamp", desc=True)
        
        # Apply filters
        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date)
                query = query.gte("timestamp", start_datetime.isoformat())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date) + timedelta(days=1)
                query = query.lt("timestamp", end_datetime.isoformat())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
        
        # Get total count for pagination (without limit/offset)
        count_result = db_admin.table("attendance").select("id", count="exact").execute()
        total_count = count_result.count or 0
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        result = query.execute()
        records_data = result.data or []
        
        # Process records
        records = []
        for record in records_data:
            user_info = record.get("users", {})
            
            # Apply student_id filter if specified
            if student_id and user_info.get("student_id", "").lower() != student_id.lower():
                continue
            
            # Apply department filter if specified
            if department and user_info.get("department", "").lower() != department.lower():
                continue
            
            records.append(AttendanceRecord(
                id=record["id"],
                user_id=record["user_id"],
                student_id=user_info.get("student_id", "Unknown"),
                full_name=user_info.get("full_name", "Unknown"),
                timestamp=record["timestamp"],
                location_verified=record["location_verified"],
                network_ssid=record.get("network_ssid"),
                confidence_score=record["confidence_score"],
                liveness_passed=record["liveness_passed"]
            ))
        
        # Calculate pagination info
        total_pages = (total_count + limit - 1) // limit
        current_page = (offset // limit) + 1
        
        return AttendanceLogResponse(
            records=records,
            total_count=len(records),  # Filtered count
            page=current_page,
            total_pages=total_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching attendance logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch attendance logs")

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    department: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all users with optional filtering"""
    try:
        db_admin = get_admin_db()
        
        query = db_admin.table("users")\
            .select("*")\
            .eq("is_active", True)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .offset(offset)
        
        if department:
            query = query.eq("department", department)
        
        result = query.execute()
        users_data = result.data or []
        
        users = []
        for user_data in users_data:
            # Get embedding count for each user
            embeddings = db_admin.table("face_embeddings")\
                .select("id", count="exact")\
                .eq("user_id", user_data["id"])\
                .execute()
            
            embeddings_count = embeddings.count or 0
            
            users.append(UserResponse(
                id=user_data["id"],
                email=user_data["email"],
                student_id=user_data["student_id"],
                full_name=user_data["full_name"],
                department=user_data.get("department"),
                year=user_data.get("year"),
                is_active=user_data["is_active"],
                created_at=user_data["created_at"],
                embeddings_count=embeddings_count
            ))
        
        return users
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.get("/network-config", response_model=NetworkRequirements)
async def get_network_configuration(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get current network configuration and requirements"""
    try:
        requirements = network_verification_service.get_network_requirements()
        return NetworkRequirements(
            allowed_ssids=requirements["allowed_ssids"],
            allowed_ip_ranges=requirements["allowed_ip_ranges"],
            verification_methods=requirements["verification_methods"],
            requirements=requirements["requirements"]
        )
        
    except Exception as e:
        logger.error(f"Error fetching network config: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch network configuration")

@router.get("/dashboard-summary")
async def get_dashboard_summary(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get comprehensive dashboard summary"""
    try:
        db_admin = get_admin_db()
        
        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)
        
        # Today's stats
        today_stats = db_admin.table("attendance")\
            .select("confidence_score, location_verified, liveness_passed", count="exact")\
            .gte("timestamp", today.isoformat())\
            .execute()
        
        # Yesterday's stats for comparison
        yesterday_stats = db_admin.table("attendance")\
            .select("id", count="exact")\
            .gte("timestamp", yesterday.isoformat())\
            .lt("timestamp", today.isoformat())\
            .execute()
        
        # Recent activity (last 10 records)
        recent_activity = db_admin.table("attendance")\
            .select("timestamp, users(student_id, full_name), confidence_score")\
            .order("timestamp", desc=True)\
            .limit(10)\
            .execute()
        
        today_records = today_stats.data or []
        today_count = today_stats.count or 0
        yesterday_count = yesterday_stats.count or 0
        
        # Calculate metrics
        avg_confidence_today = sum(r["confidence_score"] for r in today_records) / len(today_records) if today_records else 0
        success_rate_today = sum(1 for r in today_records if r["location_verified"]) / len(today_records) if today_records else 0
        liveness_rate_today = sum(1 for r in today_records if r["liveness_passed"]) / len(today_records) if today_records else 0
        
        # Format recent activity
        formatted_activity = []
        for record in (recent_activity.data or []):
            user_info = record.get("users", {})
            formatted_activity.append({
                "timestamp": record["timestamp"],
                "student_id": user_info.get("student_id", "Unknown"),
                "full_name": user_info.get("full_name", "Unknown"),
                "confidence_score": record["confidence_score"]
            })
        
        summary = {
            "today": {
                "total_attendance": today_count,
                "average_confidence": round(avg_confidence_today, 2),
                "success_rate": round(success_rate_today * 100, 1),
                "liveness_rate": round(liveness_rate_today * 100, 1)
            },
            "comparison": {
                "yesterday_count": yesterday_count,
                "change_percentage": round(((today_count - yesterday_count) / yesterday_count * 100) if yesterday_count > 0 else 0, 1)
            },
            "recent_activity": formatted_activity,
            "system_status": {
                "face_recognition": "active",
                "liveness_detection": "active",
                "network_verification": "active",
                "database": "connected"
            }
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error fetching dashboard summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard summary")