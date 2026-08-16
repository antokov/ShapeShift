package com.example.shapeshift.data.network

import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.data.model.Workout
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

/** Mirrors the /api routes in backend/main.py (see CLAUDE.md API Routes table). */
interface ApiService {

    @GET("api/routines")
    suspend fun getRoutines(): List<Routine>

    @POST("api/routines")
    suspend fun createRoutine(@Body routine: Routine): Routine

    @PUT("api/routines/{id}")
    suspend fun updateRoutine(@Path("id") id: String, @Body routine: Routine): Routine

    @DELETE("api/routines/{id}")
    suspend fun deleteRoutine(@Path("id") id: String)

    @GET("api/workouts")
    suspend fun getWorkouts(): List<Workout>

    @POST("api/workouts")
    suspend fun createWorkout(@Body workout: Workout): Workout

    @PUT("api/workouts/{id}")
    suspend fun updateWorkout(@Path("id") id: String, @Body workout: Workout): Workout

    @DELETE("api/workouts/{id}")
    suspend fun deleteWorkout(@Path("id") id: String)
}
