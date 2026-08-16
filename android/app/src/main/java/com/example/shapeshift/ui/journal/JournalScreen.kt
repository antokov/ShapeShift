package com.example.shapeshift.ui.journal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.shapeshift.data.model.Workout
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.components.AppTextField
import com.example.shapeshift.ui.components.DangerButton
import com.example.shapeshift.ui.components.GhostButton
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.components.SecondaryButton
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Danger
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary

@Composable
fun JournalScreen() {
    val container = rememberAppContainer()
    val viewModel: JournalViewModel = viewModel(
        factory = SimpleViewModelFactory { JournalViewModel(container.workoutRepository, container.routineRepository) }
    )
    val state by viewModel.uiState.collectAsState()
    var pendingDelete by remember { mutableStateOf<Workout?>(null) }

    Column(modifier = Modifier.fillMaxSize().background(PageBackground).padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Journal", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
                if (state.workouts.isNotEmpty()) {
                    Text(
                        "${state.workouts.size} ${if (state.workouts.size == 1) "Eintrag" else "Einträge"}",
                        color = TextMuted,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
            PrimaryButton(text = "+ Eintrag", onClick = viewModel::openNewEntry)
        }

        androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 8.dp))

        if (state.showForm) {
            JournalForm(state, viewModel)
            androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 8.dp))
        }

        val groups = remember(state.workouts) { groupByDate(state.workouts) }

        when {
            state.loading -> Text("Wird geladen…", color = TextMuted)
            state.workouts.isEmpty() -> Text("Noch keine Trainings gespeichert.", color = TextMuted)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                groups.forEach { (dateLabel, entries) ->
                    item {
                        Text(dateLabel, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    }
                    items(entries, key = { it.id }) { workout ->
                        JournalEntryCard(
                            workout = workout,
                            expanded = state.expandedId == workout.id,
                            onToggle = { viewModel.toggleExpanded(workout.id) },
                            onDelete = { pendingDelete = workout },
                        )
                    }
                }
            }
        }
    }

    pendingDelete?.let { workout ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Eintrag löschen?") },
            text = { Text("Dieser Eintrag wird endgültig gelöscht.") },
            confirmButton = {
                DangerButton(text = "Löschen", onClick = {
                    viewModel.deleteWorkout(workout.id)
                    pendingDelete = null
                })
            },
            dismissButton = { SecondaryButton(text = "Abbrechen", onClick = { pendingDelete = null }) },
        )
    }
}

@Composable
private fun JournalForm(state: JournalUiState, viewModel: JournalViewModel) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        var routineMenuOpen by remember { mutableStateOf(false) }
        val selectedLabel = if (state.form.routineId == FREE_TRAINING) "Freies Training"
            else state.routines.find { it.id == state.form.routineId }?.name ?: "Freies Training"

        Text("Aktivität", style = MaterialTheme.typography.labelSmall, color = TextMuted)
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SecondaryButton(text = selectedLabel, onClick = { routineMenuOpen = true }, modifier = Modifier.weight(1f))
            DropdownMenu(expanded = routineMenuOpen, onDismissRequest = { routineMenuOpen = false }) {
                DropdownMenuItem(text = { Text("Freies Training") }, onClick = {
                    viewModel.onRoutineSelected(FREE_TRAINING); routineMenuOpen = false
                })
                state.routines.forEach { routine ->
                    DropdownMenuItem(text = { Text(routine.name) }, onClick = {
                        viewModel.onRoutineSelected(routine.id); routineMenuOpen = false
                    })
                }
            }
        }

        if (state.form.routineId == FREE_TRAINING) {
            AppTextField(
                value = state.form.routineName,
                onValueChange = { v -> viewModel.updateForm { it.copy(routineName = v) } },
                label = "Name *",
                placeholder = "z. B. Laufen",
            )
        }

        AppTextField(
            value = state.form.date,
            onValueChange = { v -> viewModel.updateForm { it.copy(date = v) } },
            label = "Datum (JJJJ-MM-TT)",
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AppTextField(
                value = state.form.durationMinutes,
                onValueChange = { v -> viewModel.updateForm { it.copy(durationMinutes = v) } },
                label = "Dauer (Min.)",
                keyboardType = KeyboardType.Number,
                modifier = Modifier.weight(1f),
            )
            AppTextField(
                value = state.form.totalSets,
                onValueChange = { v -> viewModel.updateForm { it.copy(totalSets = v) } },
                label = "Sätze",
                keyboardType = KeyboardType.Number,
                modifier = Modifier.weight(1f),
            )
        }

        AppTextField(
            value = state.form.notes,
            onValueChange = { v -> viewModel.updateForm { it.copy(notes = v) } },
            label = "Notizen",
            placeholder = "Wie lief das Training?",
            singleLine = false,
            minLines = 2,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GhostButton(text = "Abbrechen", onClick = viewModel::cancelForm)
            PrimaryButton(
                text = if (state.saving) "Speichern…" else "Speichern",
                onClick = viewModel::submit,
                enabled = !state.saving,
            )
        }
    }
}

@Composable
private fun JournalEntryCard(workout: Workout, expanded: Boolean, onToggle: () -> Unit, onDelete: () -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = onToggle) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(workout.routineName.ifBlank { "Freies Training" }, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    "${workout.durationSeconds / 60} min" + if (workout.totalSets > 0) " · ${workout.totalSets} Sätze" else "",
                    color = TextSecondary,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
            DangerButton(text = "✕", onClick = onDelete)
        }
        if (expanded && workout.notes.isNotBlank()) {
            Text(workout.notes, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun groupByDate(workouts: List<Workout>): List<Pair<String, List<Workout>>> {
    val groups = LinkedHashMap<String, MutableList<Workout>>()
    for (w in workouts) {
        val dateKey = w.startedAt.take(10)
        groups.getOrPut(dateKey) { mutableListOf() }.add(w)
    }
    return groups.map { (date, list) -> date to list }
}
