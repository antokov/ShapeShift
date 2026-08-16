package com.example.shapeshift.data.model

import kotlinx.serialization.Serializable

// Mirrors backend/main.py Pydantic models exactly (field names + defaults)
// so JSON (de)serialization matches the FastAPI contract without extra mapping.

@Serializable
data class Exercise(
    val id: String,
    val name: String,
    val sets: Int? = null,
    val reps: Int? = null,
    val duration: Int? = null,
    val durationMinutes: Int? = null,
)

@Serializable
data class Routine(
    val id: String,
    val name: String,
    val description: String = "",
    val exercises: List<Exercise> = emptyList(),
    val createdAt: String,
    val routineType: String = "strength",
)

@Serializable
data class Workout(
    val id: String,
    val routineId: String,
    val routineName: String,
    val startedAt: String,
    val durationSeconds: Int = 0,
    val totalSets: Int = 0,
    val notes: String = "",
    val exerciseData: String = "",
)
