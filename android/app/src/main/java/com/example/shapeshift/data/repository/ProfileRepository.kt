package com.example.shapeshift.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.shapeshift.data.model.Profile
import com.example.shapeshift.data.model.WeightEntry
import com.example.shapeshift.data.network.SessionHolder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.profileDataStore by preferencesDataStore(name = "profile")

/**
 * Kotlin port of src/hooks/useProfile.js + useWeightLog.js. Both are
 * localStorage-only on the web (no backend), namespaced per username
 * (`fitnessapp_{username}_profile` / `..._weight_log`) — mirrored here with
 * per-username DataStore keys, kept in sync with SessionHolder.username the
 * same way RoutineRepository/WorkoutRepository refresh on user switch.
 */
class ProfileRepository(private val context: Context, appScope: CoroutineScope) {

    private val json = Json { ignoreUnknownKeys = true }

    private val _profile = MutableStateFlow(Profile())
    val profile: StateFlow<Profile> = _profile.asStateFlow()

    private val _weightEntries = MutableStateFlow<List<WeightEntry>>(emptyList())
    val weightEntries: StateFlow<List<WeightEntry>> = _weightEntries.asStateFlow()

    init {
        appScope.launch {
            SessionHolder.username.collect { refresh() }
        }
    }

    private fun profileKey(username: String) = stringPreferencesKey("profile_$username")
    private fun weightKey(username: String) = stringPreferencesKey("weight_log_$username")

    private suspend fun refresh() {
        val username = SessionHolder.username.value
        val prefs = context.profileDataStore.data.first()

        _profile.value = prefs[profileKey(username)]?.let {
            runCatching { json.decodeFromString<Profile>(it) }.getOrNull()
        } ?: Profile()

        _weightEntries.value = prefs[weightKey(username)]?.let {
            runCatching { json.decodeFromString<List<WeightEntry>>(it) }.getOrNull()
        } ?: emptyList()
    }

    suspend fun updateProfile(transform: (Profile) -> Profile) {
        val username = SessionHolder.username.value
        val updated = transform(_profile.value)
        _profile.value = updated
        context.profileDataStore.edit { it[profileKey(username)] = json.encodeToString(updated) }
    }

    suspend fun toggleZiel(value: String) = updateProfile { p ->
        p.copy(ziele = if (p.ziele.contains(value)) p.ziele - value else p.ziele + value)
    }

    suspend fun toggleEquipment(value: String) = updateProfile { p ->
        p.copy(equipment = if (p.equipment.contains(value)) p.equipment - value else p.equipment + value)
    }

    suspend fun addWeightEntry(weight: Double, date: String) {
        if (weight <= 0) return
        val username = SessionHolder.username.value
        val next = (listOf(WeightEntry(date, weight)) + _weightEntries.value.filterNot { it.date == date })
            .sortedByDescending { it.date }
        _weightEntries.value = next
        context.profileDataStore.edit { it[weightKey(username)] = json.encodeToString(next) }
    }

    suspend fun removeWeightEntry(date: String) {
        val username = SessionHolder.username.value
        val next = _weightEntries.value.filterNot { it.date == date }
        _weightEntries.value = next
        context.profileDataStore.edit { it[weightKey(username)] = json.encodeToString(next) }
    }
}
