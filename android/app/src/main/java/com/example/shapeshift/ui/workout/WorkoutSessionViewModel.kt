package com.example.shapeshift.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.model.ExerciseResult
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.data.model.Workout
import com.example.shapeshift.data.repository.WorkoutRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.UUID

data class WorkoutExerciseState(
    val id: String,
    val name: String,
    val sets: Int?,
    val reps: Int?,
    val duration: Int?,
    val durationMinutes: Int?,
    val completedSets: List<Boolean>,
    val weight: String = "",
    val actualReps: String = "",
    val actualDuration: String = "",
    val rating: Int? = null,
) {
    val isCardio: Boolean get() = durationMinutes != null
}

enum class WorkoutPhase { CONFIG, EXERCISE, PAUSE, RATE, SUMMARY }

data class WorkoutSessionUiState(
    val routineName: String = "",
    val exercises: List<WorkoutExerciseState> = emptyList(),
    val phase: WorkoutPhase = WorkoutPhase.CONFIG,
    val activeExIdx: Int = 0,
    val activeSetIdx: Int = 0,
    val elapsedSeconds: Int = 0,
    val pauseSeconds: Int? = null,
    val sessionNotes: String = "",
    val saving: Boolean = false,
) {
    val activeExercise: WorkoutExerciseState? get() = exercises.getOrNull(activeExIdx)
    val isLastSet: Boolean get() = activeSetIdx >= (activeExercise?.completedSets?.size ?: 1) - 1
    val isLastExercise: Boolean get() = activeExIdx >= exercises.size - 1
    val progressPct: Float get() = if (phase == WorkoutPhase.SUMMARY || exercises.isEmpty()) 1f else activeExIdx.toFloat() / exercises.size
    val totalCompletedSets: Int get() = exercises.sumOf { it.completedSets.count { done -> done } }
}

/** Port of the phase state machine in src/pages/WorkoutSession.jsx (exercise images/instructions omitted — out of v1 scope). */
class WorkoutSessionViewModel(
    private val routine: Routine,
    private val workoutRepository: WorkoutRepository,
) : ViewModel() {

    private val json = Json { ignoreUnknownKeys = true }
    private var startedAt: Instant = Instant.now()
    private var timerJob: Job? = null
    private var pauseJob: Job? = null

    private val _uiState = MutableStateFlow(
        WorkoutSessionUiState(
            routineName = routine.name,
            exercises = routine.exercises.map { ex ->
                WorkoutExerciseState(
                    id = ex.id,
                    name = ex.name,
                    sets = ex.sets,
                    reps = ex.reps,
                    duration = ex.duration,
                    durationMinutes = ex.durationMinutes,
                    completedSets = List(if (ex.durationMinutes != null) 1 else (ex.sets ?: 1)) { false },
                    actualReps = ex.reps?.toString() ?: "",
                    actualDuration = ex.duration?.toString() ?: "",
                )
            },
        )
    )
    val uiState: StateFlow<WorkoutSessionUiState> = _uiState.asStateFlow()

    fun adjustSets(exerciseId: String, delta: Int) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { ex ->
                if (ex.id != exerciseId) ex
                else {
                    val newLen = (ex.completedSets.size + delta).coerceAtLeast(1)
                    ex.copy(completedSets = List(newLen) { false })
                }
            }
        )
    }

    fun startWorkout() {
        startedAt = Instant.now()
        val hasExercises = _uiState.value.exercises.isNotEmpty()
        _uiState.value = _uiState.value.copy(phase = if (hasExercises) WorkoutPhase.EXERCISE else WorkoutPhase.SUMMARY)
        startTimer()
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.value = _uiState.value.copy(
                    elapsedSeconds = ((Instant.now().toEpochMilli() - startedAt.toEpochMilli()) / 1000).toInt()
                )
            }
        }
    }

    fun updateActiveField(field: String, value: String) {
        val idx = _uiState.value.activeExIdx
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.mapIndexed { i, ex ->
                if (i != idx) ex else when (field) {
                    "weight" -> ex.copy(weight = value)
                    "actualReps" -> ex.copy(actualReps = value)
                    "actualDuration" -> ex.copy(actualDuration = value)
                    else -> ex
                }
            }
        )
    }

    fun setRating(value: Int) {
        val idx = _uiState.value.activeExIdx
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.mapIndexed { i, ex ->
                if (i != idx) ex else ex.copy(rating = if (ex.rating == value) null else value)
            }
        )
    }

    fun completeSet() {
        val state = _uiState.value
        val idx = state.activeExIdx
        val setIdx = state.activeSetIdx
        val updatedExercises = state.exercises.mapIndexed { i, ex ->
            if (i != idx) ex else {
                val newSets = ex.completedSets.toMutableList().also { it[setIdx] = true }
                ex.copy(completedSets = newSets)
            }
        }
        val isCardio = state.activeExercise?.isCardio == true
        if (isCardio) {
            _uiState.value = state.copy(exercises = updatedExercises, phase = WorkoutPhase.RATE)
        } else {
            _uiState.value = state.copy(exercises = updatedExercises, phase = WorkoutPhase.PAUSE, pauseSeconds = 60)
            startPauseCountdown()
        }
    }

    private fun startPauseCountdown() {
        pauseJob?.cancel()
        pauseJob = viewModelScope.launch {
            while (_uiState.value.phase == WorkoutPhase.PAUSE && (_uiState.value.pauseSeconds ?: 0) > 0) {
                delay(1000)
                val remaining = (_uiState.value.pauseSeconds ?: 1) - 1
                _uiState.value = _uiState.value.copy(pauseSeconds = remaining.coerceAtLeast(0))
            }
            if (_uiState.value.phase == WorkoutPhase.PAUSE) advanceFromPause()
        }
    }

    fun skipPause() {
        pauseJob?.cancel()
        advanceFromPause()
    }

    private fun advanceFromPause() {
        val state = _uiState.value
        if (state.phase != WorkoutPhase.PAUSE) return
        if (state.isLastSet) {
            _uiState.value = state.copy(phase = WorkoutPhase.RATE, pauseSeconds = null)
        } else {
            _uiState.value = state.copy(
                phase = WorkoutPhase.EXERCISE,
                activeSetIdx = state.activeSetIdx + 1,
                pauseSeconds = null,
            )
        }
    }

    fun nextExercise() {
        val state = _uiState.value
        _uiState.value = if (state.isLastExercise) {
            state.copy(phase = WorkoutPhase.SUMMARY)
        } else {
            state.copy(phase = WorkoutPhase.EXERCISE, activeExIdx = state.activeExIdx + 1, activeSetIdx = 0)
        }
    }

    fun setSessionNotes(value: String) {
        _uiState.value = _uiState.value.copy(sessionNotes = value.take(500))
    }

    fun finish(onFinished: () -> Unit) {
        val state = _uiState.value
        _uiState.value = state.copy(saving = true)
        val exerciseData = json.encodeToString(
            state.exercises.map { ex ->
                ExerciseResult(
                    id = ex.id,
                    name = ex.name,
                    weight = ex.weight.toDoubleOrNull(),
                    actualReps = ex.actualReps.toDoubleOrNull()?.toInt(),
                    actualDuration = ex.actualDuration.toDoubleOrNull()?.toInt(),
                    rating = ex.rating,
                    completedSets = ex.completedSets,
                )
            }
        )
        val workout = Workout(
            id = UUID.randomUUID().toString(),
            routineId = routine.id,
            routineName = routine.name,
            startedAt = startedAt.toString(),
            durationSeconds = state.elapsedSeconds,
            totalSets = state.totalCompletedSets,
            notes = state.sessionNotes.trim(),
            exerciseData = exerciseData,
        )
        viewModelScope.launch {
            val result = workoutRepository.addWorkout(workout)
            result.onSuccess {
                timerJob?.cancel()
                onFinished()
            }.onFailure {
                _uiState.value = _uiState.value.copy(saving = false)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        pauseJob?.cancel()
    }
}

fun formatWorkoutTime(seconds: Int): String {
    val m = (seconds / 60).toString().padStart(2, '0')
    val s = (seconds % 60).toString().padStart(2, '0')
    return "$m:$s"
}
