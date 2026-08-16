package com.example.shapeshift.data.model

import kotlinx.serialization.Serializable

/**
 * Per-exercise results recorded during/after a workout. Stored client-side as
 * a JSON string inside [Workout.exerciseData] — the backend treats that
 * column as opaque text (see backend/main.py Workout.exerciseData), mirroring
 * how src/pages/WorkoutSession.jsx / JournalView.jsx build it.
 */
@Serializable
data class ExerciseResult(
    val id: String,
    val name: String,
    val weight: Double? = null,
    val actualReps: Int? = null,
    val actualDuration: Int? = null,
    val rating: Int? = null,
    val completedSets: List<Boolean> = emptyList(),
)
