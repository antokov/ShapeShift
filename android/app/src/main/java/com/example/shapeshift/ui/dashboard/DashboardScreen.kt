package com.example.shapeshift.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.shapeshift.data.model.Workout
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun DashboardScreen() {
    val container = rememberAppContainer()
    val viewModel: DashboardViewModel = viewModel(
        factory = SimpleViewModelFactory { DashboardViewModel(container.workoutRepository) }
    )
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Text("Fitness", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)

        Text("Trainingsübersicht", style = MaterialTheme.typography.titleLarge, color = TextPrimary)

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            state.kpis.chunked(2).forEach { rowKpis ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    rowKpis.forEach { kpi ->
                        KpiCard(kpi, modifier = Modifier.weight(1f))
                    }
                    if (rowKpis.size < 2) {
                        androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Letzte Trainings", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            if (state.recent.isEmpty()) {
                Text("Noch keine Trainings aufgezeichnet.", color = TextMuted, style = MaterialTheme.typography.bodyMedium)
            } else {
                state.recent.forEach { workout -> RecentWorkoutRow(workout) }
            }
        }
    }
}

@Composable
private fun KpiCard(kpi: KpiItem, modifier: Modifier = Modifier) {
    AppCard(modifier = modifier.fillMaxWidth()) {
        Text(
            buildString {
                append(kpi.value)
                if (kpi.unit.isNotEmpty()) append(" ${kpi.unit}")
            },
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
        )
        Text(kpi.label, style = MaterialTheme.typography.labelMedium, color = TextMuted)
    }
}

@Composable
private fun RecentWorkoutRow(workout: Workout) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Text(workout.routineName.ifBlank { "Freies Training" }, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
        Text(
            "${formatRecentDate(workout.startedAt)} · ${workout.durationSeconds / 60} min · ${workout.totalSets} Sätze",
            style = MaterialTheme.typography.labelMedium,
            color = TextSecondary,
        )
    }
}

private fun formatRecentDate(iso: String): String = runCatching {
    val instant = Instant.parse(iso)
    val formatter = DateTimeFormatter.ofPattern("EEE, d. MMM", Locale.GERMAN)
    formatter.format(instant.atZone(ZoneId.systemDefault()))
}.getOrDefault(iso)
