package com.example.shapeshift.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.model.Profile
import com.example.shapeshift.data.model.WeightEntry
import com.example.shapeshift.data.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.Period

data class ProfileUiState(
    val profile: Profile = Profile(),
    val weightEntries: List<WeightEntry> = emptyList(),
)

val ERFAHRUNGSSTUFEN = listOf("Anfänger", "Fortgeschrittener", "Profi")
val GESCHLECHT_OPTIONS = listOf("männlich", "weiblich", "divers")
val ZIELE_OPTIONS = listOf(
    "Muskelaufbau", "Gewichtsverlust", "Kraft steigern",
    "Ausdauer verbessern", "Allgemeine Fitness", "Flexibilität & Mobilität",
)
data class EquipmentOption(val value: String, val label: String)
val EQUIPMENT_OPTIONS = listOf(
    EquipmentOption("body only", "Körpergewicht"),
    EquipmentOption("barbell", "Langhantel"),
    EquipmentOption("dumbbell", "Kurzhanteln"),
    EquipmentOption("cable", "Kabelzug"),
    EquipmentOption("machine", "Maschine"),
    EquipmentOption("kettlebells", "Kettlebell"),
    EquipmentOption("bands", "Widerstandsbänder"),
    EquipmentOption("e-z curl bar", "EZ-Stange"),
    EquipmentOption("exercise ball", "Pezziball"),
    EquipmentOption("foam roll", "Foam Roller"),
    EquipmentOption("medicine ball", "Medizinball"),
    EquipmentOption("other", "Sonstiges"),
)

fun computeAge(geburtsdatum: String?): Int? {
    if (geburtsdatum.isNullOrBlank()) return null
    return runCatching { Period.between(LocalDate.parse(geburtsdatum), LocalDate.now()).years }.getOrNull()
}

/** Port of src/pages/UserProfile.jsx (state/actions — layout lives in the Composable). */
class ProfileViewModel(private val repository: ProfileRepository) : ViewModel() {

    val uiState: StateFlow<ProfileUiState> = combine(
        repository.profile,
        repository.weightEntries,
    ) { profile, entries -> ProfileUiState(profile, entries) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ProfileUiState())

    fun setVorname(value: String) {
        if (value.length <= 50) viewModelScope.launch { repository.updateProfile { it.copy(vorname = value) } }
    }

    fun setGeburtsdatum(value: String?) {
        viewModelScope.launch { repository.updateProfile { it.copy(geburtsdatum = value?.takeIf { d -> d.isNotBlank() }) } }
    }

    fun setGeschlecht(value: String?) {
        viewModelScope.launch { repository.updateProfile { it.copy(geschlecht = value) } }
    }

    fun setGroesse(value: String) {
        val parsed = value.toIntOrNull()
        viewModelScope.launch { repository.updateProfile { it.copy(groesse = parsed) } }
    }

    fun toggleZiel(value: String) = viewModelScope.launch { repository.toggleZiel(value) }
    fun toggleEquipment(value: String) = viewModelScope.launch { repository.toggleEquipment(value) }

    fun setErfahrungsstufe(value: String?) {
        viewModelScope.launch { repository.updateProfile { it.copy(erfahrungsstufe = value) } }
    }

    fun setTrainingstage(value: String) {
        val parsed = value.toIntOrNull()
        if (parsed == null || parsed in 1..7) {
            viewModelScope.launch { repository.updateProfile { it.copy(trainingsTageProWoche = parsed) } }
        }
    }

    fun setVerletzungen(value: String) {
        if (value.length <= 300) viewModelScope.launch { repository.updateProfile { it.copy(verletzungen = value) } }
    }

    private val _weightInput = MutableStateFlow("")
    val weightInput: StateFlow<String> = _weightInput.asStateFlow()
    private val _dateInput = MutableStateFlow(LocalDate.now().toString())
    val dateInput: StateFlow<String> = _dateInput.asStateFlow()

    fun setWeightInput(value: String) { _weightInput.value = value }
    fun setDateInput(value: String) { _dateInput.value = value }

    fun addWeightEntry() {
        val weight = _weightInput.value.toDoubleOrNull() ?: return
        if (weight <= 0) return
        val date = _dateInput.value.ifBlank { LocalDate.now().toString() }
        viewModelScope.launch {
            repository.addWeightEntry(weight, date)
            _weightInput.value = ""
            _dateInput.value = LocalDate.now().toString()
        }
    }

    fun removeWeightEntry(date: String) = viewModelScope.launch { repository.removeWeightEntry(date) }
}
