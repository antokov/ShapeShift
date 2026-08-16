package com.example.shapeshift.data.repository

import com.example.shapeshift.data.model.Workout
import com.example.shapeshift.data.network.ApiService
import com.example.shapeshift.data.network.SessionHolder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Kotlin port of src/hooks/useWorkouts.js — same /api/workouts endpoints. */
class WorkoutRepository(private val api: ApiService, private val appScope: CoroutineScope) {

    private val _workouts = MutableStateFlow<List<Workout>>(emptyList())
    val workouts: StateFlow<List<Workout>> = _workouts.asStateFlow()

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    init {
        appScope.launch {
            SessionHolder.username.collect { refresh() }
        }
    }

    private fun sortDesc(list: List<Workout>) = list.sortedByDescending { it.startedAt }

    suspend fun refresh() {
        _loading.value = true
        try {
            _workouts.value = sortDesc(api.getWorkouts())
        } catch (e: Exception) {
            _workouts.value = emptyList()
        } finally {
            _loading.value = false
        }
    }

    suspend fun addWorkout(workout: Workout): Result<Unit> = runCatching {
        val created = api.createWorkout(workout)
        _workouts.value = sortDesc(listOf(created) + _workouts.value)
    }

    suspend fun updateWorkout(id: String, workout: Workout): Result<Unit> = runCatching {
        val updated = api.updateWorkout(id, workout)
        _workouts.value = sortDesc(_workouts.value.map { if (it.id == id) updated else it })
    }

    suspend fun deleteWorkout(id: String): Result<Unit> = runCatching {
        api.deleteWorkout(id)
        _workouts.value = _workouts.value.filterNot { it.id == id }
    }
}
