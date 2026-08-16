package com.example.shapeshift.data.repository

import com.example.shapeshift.data.model.Exercise
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.data.network.ApiService
import com.example.shapeshift.data.network.SessionHolder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Instant
import java.util.UUID

data class ImportResult(val imported: Int, val skipped: Int)

/**
 * Kotlin port of src/hooks/useRoutines.js — same endpoints (/api/routines),
 * shared as a single app-scoped instance (like the hook lifted into
 * AppShell in App.jsx) so every screen sees the same in-memory list instead
 * of refetching on every navigation.
 */
class RoutineRepository(private val api: ApiService, private val appScope: CoroutineScope) {

    private val _routines = MutableStateFlow<List<Routine>>(emptyList())
    val routines: StateFlow<List<Routine>> = _routines.asStateFlow()

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        appScope.launch {
            SessionHolder.username.collect { refresh() }
        }
    }

    suspend fun refresh() {
        _loading.value = true
        try {
            _routines.value = api.getRoutines()
            _error.value = null
        } catch (e: Exception) {
            _error.value = "Server nicht erreichbar. Bitte Backend starten."
        } finally {
            _loading.value = false
        }
    }

    suspend fun addRoutine(routine: Routine): Result<Unit> = runCatching {
        val created = api.createRoutine(routine)
        _routines.value = _routines.value + created
    }

    suspend fun updateRoutine(id: String, routine: Routine): Result<Unit> = runCatching {
        val updated = api.updateRoutine(id, routine)
        _routines.value = _routines.value.map { if (it.id == id) updated else it }
    }

    suspend fun deleteRoutine(id: String): Result<Unit> = runCatching {
        api.deleteRoutine(id)
        _routines.value = _routines.value.filterNot { it.id == id }
    }

    suspend fun importRoutines(jsonText: String): Result<ImportResult> = runCatching {
        val parsed = Json.parseToJsonElement(jsonText)
        val array = (parsed as? JsonArray) ?: throw Exception("Die Datei muss ein JSON-Array von Routinen enthalten.")
        if (array.isEmpty()) throw Exception("Die Datei enthält keine Routinen.")

        var imported = 0
        var skipped = 0
        for (element in array) {
            val obj = element as? JsonObject
            val name = obj?.get("name")?.jsonPrimitive?.content?.trim()
            if (obj == null || name.isNullOrEmpty()) {
                skipped++
                continue
            }
            val description = obj["description"]?.jsonPrimitive?.content ?: ""
            val routineType = obj["routineType"]?.jsonPrimitive?.content ?: "strength"
            val exercisesArray = obj["exercises"] as? JsonArray ?: JsonArray(emptyList())
            val exercises = exercisesArray.mapNotNull { exEl ->
                val exObj = exEl as? JsonObject ?: return@mapNotNull null
                Exercise(
                    id = UUID.randomUUID().toString(),
                    name = exObj["name"]?.jsonPrimitive?.content ?: "",
                    sets = exObj["sets"]?.jsonPrimitive?.content?.toDoubleOrNull()?.toInt() ?: 1,
                    reps = exObj["reps"]?.jsonPrimitive?.content?.toDoubleOrNull()?.toInt(),
                    duration = exObj["duration"]?.jsonPrimitive?.content?.toDoubleOrNull()?.toInt(),
                    durationMinutes = exObj["durationMinutes"]?.jsonPrimitive?.content?.toDoubleOrNull()?.toInt(),
                )
            }
            val routine = Routine(
                id = UUID.randomUUID().toString(),
                name = name,
                description = description,
                routineType = routineType,
                exercises = exercises,
                createdAt = obj["createdAt"]?.jsonPrimitive?.content ?: Instant.now().toString(),
            )
            val created = api.createRoutine(routine)
            _routines.value = _routines.value + created
            imported++
        }
        ImportResult(imported, skipped)
    }
}
