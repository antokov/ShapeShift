package com.example.shapeshift.ui.journal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.data.model.Workout
import com.example.shapeshift.data.repository.RoutineRepository
import com.example.shapeshift.data.repository.WorkoutRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

const val FREE_TRAINING = "__free__"

data class JournalFormState(
    val routineId: String = FREE_TRAINING,
    val routineName: String = "",
    val date: String = LocalDate.now().toString(),
    val durationMinutes: String = "",
    val totalSets: String = "",
    val notes: String = "",
)

data class JournalUiState(
    val workouts: List<Workout> = emptyList(),
    val routines: List<Routine> = emptyList(),
    val loading: Boolean = true,
    val showForm: Boolean = false,
    val form: JournalFormState = JournalFormState(),
    val editingId: String? = null,
    val saving: Boolean = false,
    val expandedId: String? = null,
)

/** Port of the manual-entry + list portion of src/pages/JournalView.jsx (Garmin merge omitted — out of v1 scope). */
class JournalViewModel(
    private val workoutRepository: WorkoutRepository,
    private val routineRepository: RoutineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(JournalUiState())
    val uiState: StateFlow<JournalUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            workoutRepository.workouts.collect { list ->
                _uiState.value = _uiState.value.copy(workouts = list)
            }
        }
        viewModelScope.launch {
            routineRepository.routines.collect { list ->
                _uiState.value = _uiState.value.copy(routines = list)
            }
        }
        viewModelScope.launch {
            workoutRepository.loading.collect { loading ->
                _uiState.value = _uiState.value.copy(loading = loading)
            }
        }
    }

    fun openNewEntry() {
        _uiState.value = _uiState.value.copy(
            showForm = true,
            form = JournalFormState(),
            editingId = null,
            expandedId = null,
        )
    }

    fun toggleExpanded(id: String) {
        _uiState.value = _uiState.value.copy(expandedId = if (_uiState.value.expandedId == id) null else id)
    }

    fun cancelForm() {
        _uiState.value = _uiState.value.copy(showForm = false, form = JournalFormState(), editingId = null)
    }

    fun updateForm(transform: (JournalFormState) -> JournalFormState) {
        _uiState.value = _uiState.value.copy(form = transform(_uiState.value.form))
    }

    fun onRoutineSelected(routineId: String) {
        if (routineId == FREE_TRAINING) {
            updateForm { it.copy(routineId = FREE_TRAINING, routineName = "") }
        } else {
            val routine = _uiState.value.routines.find { it.id == routineId }
            updateForm { it.copy(routineId = routineId, routineName = routine?.name ?: "") }
        }
    }

    fun deleteWorkout(id: String) {
        viewModelScope.launch { workoutRepository.deleteWorkout(id) }
    }

    fun submit() {
        val form = _uiState.value.form
        if (form.routineName.isBlank() && form.routineId == FREE_TRAINING) return
        val routineName = if (form.routineId == FREE_TRAINING) form.routineName.trim()
            else _uiState.value.routines.find { it.id == form.routineId }?.name ?: form.routineName

        val payload = Workout(
            id = _uiState.value.editingId ?: UUID.randomUUID().toString(),
            routineId = if (form.routineId == FREE_TRAINING) "" else form.routineId,
            routineName = routineName.trim(),
            startedAt = if (form.date.isNotBlank()) "${form.date}T12:00:00.000Z" else Instant.now().toString(),
            durationSeconds = (form.durationMinutes.toIntOrNull() ?: 0) * 60,
            totalSets = form.totalSets.toIntOrNull() ?: 0,
            notes = form.notes.trim(),
            exerciseData = "",
        )

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(saving = true)
            val editingId = _uiState.value.editingId
            val result = if (editingId != null) {
                workoutRepository.updateWorkout(editingId, payload)
            } else {
                workoutRepository.addWorkout(payload)
            }
            result.onSuccess {
                _uiState.value = _uiState.value.copy(
                    saving = false,
                    showForm = false,
                    form = JournalFormState(),
                    editingId = null,
                )
            }.onFailure {
                _uiState.value = _uiState.value.copy(saving = false)
            }
        }
    }
}
