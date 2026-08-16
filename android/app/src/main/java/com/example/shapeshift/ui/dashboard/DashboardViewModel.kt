package com.example.shapeshift.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.model.Workout
import com.example.shapeshift.data.model.ExerciseResult
import com.example.shapeshift.data.repository.WorkoutRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

data class KpiItem(val value: String, val unit: String, val label: String)

data class DashboardUiState(
    val kpis: List<KpiItem> = emptyList(),
    val recent: List<Workout> = emptyList(),
    val loading: Boolean = true,
)

/** Port of the KPI/recent-list portion of src/pages/Dashboard.jsx (chart/Garmin/profile widgets are out of v1 scope). */
class DashboardViewModel(private val workoutRepository: WorkoutRepository) : ViewModel() {

    private val json = Json { ignoreUnknownKeys = true }

    val uiState: StateFlow<DashboardUiState> = combine(
        workoutRepository.workouts,
        workoutRepository.loading,
    ) { workouts, loading ->
        DashboardUiState(
            kpis = computeKpis(workouts),
            recent = workouts.take(3),
            loading = loading,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardUiState())

    private fun parseAvgRating(exerciseDataStr: String): Double? {
        if (exerciseDataStr.isBlank()) return null
        return try {
            val list: List<ExerciseResult> = json.decodeFromString(exerciseDataStr)
            val ratings = list.mapNotNull { it.rating }
            if (ratings.isEmpty()) null else ratings.average()
        } catch (e: Exception) {
            null
        }
    }

    private fun computeStreak(workouts: List<Workout>): Int {
        val trainedDays = workouts.mapNotNull { runCatching { Instant.parse(it.startedAt).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull() }.toSet()
        val today = java.time.LocalDate.now()
        var streak = 0
        var day = today
        while (trainedDays.contains(day)) {
            streak++
            day = day.minusDays(1)
        }
        return streak
    }

    private fun computeFavoriteRoutine(workouts: List<Workout>): String {
        val thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS)
        val counts = workouts
            .filter { it.routineName.isNotBlank() && runCatching { Instant.parse(it.startedAt) }.getOrNull()?.isAfter(thirtyDaysAgo) == true }
            .groupingBy { it.routineName }
            .eachCount()
        if (counts.isEmpty()) return "—"
        val name = counts.entries.maxWithOrNull(compareBy({ it.value }, { it.key }))?.key ?: return "—"
        return if (name.length > 16) name.take(15) + "…" else name
    }

    private fun ratingEmoji(avg: Double): String = when {
        avg >= 1.5 -> "😊"
        avg >= 0.5 -> "😐"
        else -> "😢"
    }

    private fun computeKpis(workouts: List<Workout>): List<KpiItem> {
        val now = Instant.now()
        val sevenDaysAgo = now.minus(7, ChronoUnit.DAYS)

        val recent = workouts.filter { runCatching { Instant.parse(it.startedAt) }.getOrNull()?.isAfter(sevenDaysAgo) == true }
        val trainingsWeek = recent.size
        val minutesWeek = recent.sumOf { it.durationSeconds / 60 }
        val streak = computeStreak(workouts)
        val favoriteRoutine = computeFavoriteRoutine(workouts)

        val recentRatings = recent.mapNotNull { parseAvgRating(it.exerciseData) }
        val avgRating = if (recentRatings.isEmpty()) null else recentRatings.average()

        return listOf(
            KpiItem(trainingsWeek.toString(), "", "Trainings (7 Tage)"),
            KpiItem(minutesWeek.toString(), "min", "Aktiv (7 Tage)"),
            KpiItem(streak.toString(), if (streak == 1) "Tag" else "Tage", "Streak 🔥"),
            KpiItem(
                avgRating?.let { "%.1f".format(it) } ?: "—",
                avgRating?.let { ratingEmoji(it) } ?: "",
                "Ø Bewertung (7 Tage)",
            ),
            KpiItem(favoriteRoutine, "", "Lieblingsroutine (30 Tage)"),
            KpiItem(workouts.size.toString(), "", "Gesamt"),
        )
    }
}
