package com.example.shapeshift.ui.routines.form

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.model.Exercise
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.data.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID

const val MAX_NAME = 100
const val MAX_DESC = 500

data class ExerciseFormRow(
    val id: String = UUID.randomUUID().toString(),
    val name: String = "",
    val sets: String = "",
    val reps: String = "",
    val duration: String = "",
    val useDuration: Boolean = false, // false = reps, true = duration (strength only)
    val durationMinutes: String = "", // cardio only
    val nameError: String? = null,
    val valueError: String? = null,
)

data class RoutineFormUiState(
    val isEdit: Boolean = false,
    val routineType: String = "strength",
    val name: String = "",
    val description: String = "",
    val exercises: List<ExerciseFormRow> = listOf(ExerciseFormRow()),
    val nameError: String? = null,
    val exercisesError: String? = null,
    val submitted: Boolean = false,
    val saveError: String? = null,
    val saving: Boolean = false,
)

/** Port of src/pages/RoutineForm.jsx (exercise-library picker omitted — out of v1 scope). */
class RoutineFormViewModel(
    private val repository: RoutineRepository,
    private val existing: Routine?,
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        RoutineFormUiState(
            isEdit = existing != null,
            routineType = existing?.routineType ?: "strength",
            name = existing?.name ?: "",
            description = existing?.description ?: "",
            exercises = existing?.exercises?.map { it.toFormRow() } ?: listOf(ExerciseFormRow()),
        )
    )
    val uiState: StateFlow<RoutineFormUiState> = _uiState.asStateFlow()

    private fun Exercise.toFormRow(): ExerciseFormRow = if (durationMinutes != null) {
        ExerciseFormRow(id = id, name = name, durationMinutes = durationMinutes.toString())
    } else {
        ExerciseFormRow(
            id = id,
            name = name,
            sets = (sets ?: 1).toString(),
            reps = reps?.toString() ?: "",
            duration = duration?.toString() ?: "",
            useDuration = duration != null,
        )
    }

    fun setRoutineType(type: String) {
        _uiState.value = _uiState.value.copy(
            routineType = type,
            exercises = listOf(ExerciseFormRow()),
            nameError = null,
            exercisesError = null,
            submitted = false,
        )
    }

    fun setName(value: String) {
        if (value.length <= MAX_NAME) _uiState.value = _uiState.value.copy(name = value)
    }

    fun setDescription(value: String) {
        if (value.length <= MAX_DESC) _uiState.value = _uiState.value.copy(description = value)
    }

    fun updateExercise(id: String, transform: (ExerciseFormRow) -> ExerciseFormRow) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { if (it.id == id) transform(it) else it }
        )
    }

    fun addExercise() {
        _uiState.value = _uiState.value.copy(exercises = _uiState.value.exercises + ExerciseFormRow())
    }

    fun removeExercise(id: String) {
        _uiState.value = _uiState.value.copy(exercises = _uiState.value.exercises.filterNot { it.id == id })
    }

    private fun validate(state: RoutineFormUiState): RoutineFormUiState {
        var nameError: String? = null
        if (state.name.isBlank()) nameError = "Name ist erforderlich."

        var exercisesError: String? = null
        if (state.exercises.isEmpty()) exercisesError = "Mindestens eine Übung hinzufügen."

        val validatedExercises = state.exercises.map { row ->
            var nErr: String? = null
            var vErr: String? = null
            if (row.name.isBlank()) nErr = "Übungsname erforderlich."
            if (state.routineType == "cardio") {
                val dur = row.durationMinutes.toDoubleOrNull()
                if (dur == null || dur < 1) vErr = "≥ 1 Min."
            } else {
                val sets = row.sets.toDoubleOrNull()
                if (sets == null || sets < 1) vErr = "≥ 1"
                else if (!row.useDuration) {
                    val reps = row.reps.toDoubleOrNull()
                    if (reps == null || reps < 1) vErr = "≥ 1"
                } else {
                    val dur = row.duration.toDoubleOrNull()
                    if (dur == null || dur < 1) vErr = "≥ 1 Sek."
                }
            }
            row.copy(nameError = nErr, valueError = vErr)
        }

        return state.copy(
            nameError = nameError,
            exercisesError = exercisesError,
            exercises = validatedExercises,
            submitted = true,
        )
    }

    fun save(onSaved: () -> Unit) {
        val validated = validate(_uiState.value)
        _uiState.value = validated
        val hasErrors = validated.nameError != null || validated.exercisesError != null ||
            validated.exercises.any { it.nameError != null || it.valueError != null }
        if (hasErrors) return

        val exercises = if (validated.routineType == "cardio") {
            validated.exercises.map {
                Exercise(id = it.id, name = it.name.trim(), durationMinutes = it.durationMinutes.toDouble().toInt())
            }
        } else {
            validated.exercises.map {
                Exercise(
                    id = it.id,
                    name = it.name.trim(),
                    sets = it.sets.toDouble().toInt(),
                    reps = if (!it.useDuration) it.reps.toDouble().toInt() else null,
                    duration = if (it.useDuration) it.duration.toDouble().toInt() else null,
                )
            }
        }

        val routine = Routine(
            id = existing?.id ?: UUID.randomUUID().toString(),
            name = validated.name.trim(),
            description = validated.description.trim().take(MAX_DESC),
            routineType = validated.routineType,
            exercises = exercises,
            createdAt = existing?.createdAt ?: Instant.now().toString(),
        )

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(saving = true, saveError = null)
            val result = if (existing != null) {
                repository.updateRoutine(existing.id, routine)
            } else {
                repository.addRoutine(routine)
            }
            result.onSuccess {
                _uiState.value = _uiState.value.copy(saving = false)
                onSaved()
            }.onFailure {
                _uiState.value = _uiState.value.copy(
                    saving = false,
                    saveError = "Speichern fehlgeschlagen. Ist das Backend erreichbar?",
                )
            }
        }
    }
}
