package com.example.shapeshift.ui.routines.list

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ImportStatus(val success: Boolean, val message: String)

/** Port of src/pages/RoutineList.jsx (state/actions only — layout lives in the Composable). */
class RoutineListViewModel(private val repository: RoutineRepository) : ViewModel() {

    val routines = repository.routines
    val loading = repository.loading
    val error = repository.error

    private val _importStatus = MutableStateFlow<ImportStatus?>(null)
    val importStatus: StateFlow<ImportStatus?> = _importStatus.asStateFlow()

    private val _importing = MutableStateFlow(false)
    val importing: StateFlow<Boolean> = _importing.asStateFlow()

    fun deleteRoutine(id: String) {
        viewModelScope.launch { repository.deleteRoutine(id) }
    }

    fun importFromJson(jsonText: String) {
        viewModelScope.launch {
            _importing.value = true
            val result = repository.importRoutines(jsonText)
            _importing.value = false
            result.onSuccess { r ->
                val msg = if (r.skipped > 0) {
                    "${r.imported} Routine(n) importiert, ${r.skipped} übersprungen."
                } else {
                    "${r.imported} Routine(n) erfolgreich importiert."
                }
                _importStatus.value = ImportStatus(true, msg)
            }.onFailure { e ->
                _importStatus.value = ImportStatus(false, e.message ?: "Import fehlgeschlagen.")
            }
        }
    }

    fun clearImportStatus() {
        _importStatus.value = null
    }
}
