package com.example.shapeshift.ui.workout

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.components.AppTextField
import com.example.shapeshift.ui.components.GhostButton
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.components.SecondaryButton
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Border
import com.example.shapeshift.ui.theme.Indigo
import com.example.shapeshift.ui.theme.OrangeStart
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary

private val RATINGS = listOf(0 to "😢", 1 to "😐", 2 to "😊")

@Composable
fun WorkoutSessionScreen(
    routine: Routine,
    onFinish: () -> Unit,
    onAbort: () -> Unit,
) {
    val container = rememberAppContainer()
    val viewModel: WorkoutSessionViewModel = viewModel(
        factory = SimpleViewModelFactory { WorkoutSessionViewModel(routine, container.workoutRepository) }
    )
    val state by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize().background(PageBackground).padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            GhostButton(text = "← Abbrechen", onClick = onAbort, enabled = !state.saving)
            Text(state.routineName, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text(formatWorkoutTime(state.elapsedSeconds), style = MaterialTheme.typography.titleMedium, color = TextPrimary)
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .height(6.dp)
                .background(Border, RoundedCornerShape(3.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(state.progressPct)
                    .height(6.dp)
                    .background(OrangeStart, RoundedCornerShape(3.dp))
            )
        }

        when (state.phase) {
            WorkoutPhase.CONFIG -> ConfigPhase(state, viewModel, onStart = viewModel::startWorkout)
            WorkoutPhase.EXERCISE -> ExercisePhase(state, viewModel)
            WorkoutPhase.PAUSE -> PausePhase(state, onSkip = viewModel::skipPause)
            WorkoutPhase.RATE -> RatePhase(state, viewModel)
            WorkoutPhase.SUMMARY -> SummaryPhase(state, viewModel, onFinish = { viewModel.finish(onFinish) })
        }
    }
}

@Composable
private fun ConfigPhase(state: WorkoutSessionUiState, viewModel: WorkoutSessionViewModel, onStart: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Satzanzahl anpassen (optional)", color = TextMuted, style = MaterialTheme.typography.bodyMedium)
        if (state.exercises.isEmpty()) {
            Text("Keine Übungen in dieser Routine.", color = TextMuted)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f, fill = false)) {
                items(state.exercises, key = { it.id }) { ex ->
                    AppCard(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            ex.name,
                            color = TextPrimary,
                            style = MaterialTheme.typography.titleMedium,
                            maxLines = 2,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                        )
                        if (ex.isCardio) {
                            Text("${ex.durationMinutes} min", color = TextSecondary)
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                SecondaryButton(text = "−", onClick = { viewModel.adjustSets(ex.id, -1) }, enabled = ex.completedSets.size > 1)
                                Text("${ex.completedSets.size} Sätze", color = TextPrimary)
                                SecondaryButton(text = "+", onClick = { viewModel.adjustSets(ex.id, 1) })
                            }
                        }
                    }
                }
            }
        }
        PrimaryButton(text = "Training starten", onClick = onStart, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun ExercisePhase(state: WorkoutSessionUiState, viewModel: WorkoutSessionViewModel) {
    val ex = state.activeExercise ?: return
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Übung ${state.activeExIdx + 1} von ${state.exercises.size}", color = TextMuted, style = MaterialTheme.typography.labelMedium)
        Text(ex.name, style = MaterialTheme.typography.headlineMedium, color = TextPrimary)

        if (!ex.isCardio) {
            Text("Satz ${state.activeSetIdx + 1} von ${ex.completedSets.size}", color = TextSecondary)
        }

        if (ex.isCardio) {
            Text("${ex.durationMinutes} min", style = MaterialTheme.typography.headlineMedium, color = Indigo)
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AppTextField(
                    value = ex.weight,
                    onValueChange = { viewModel.updateActiveField("weight", it) },
                    label = "Gewicht (kg)",
                    keyboardType = KeyboardType.Number,
                    modifier = Modifier.weight(1f),
                )
                if (ex.reps != null) {
                    AppTextField(
                        value = ex.actualReps,
                        onValueChange = { viewModel.updateActiveField("actualReps", it) },
                        label = "Wdh.",
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                    )
                }
                if (ex.duration != null) {
                    AppTextField(
                        value = ex.actualDuration,
                        onValueChange = { viewModel.updateActiveField("actualDuration", it) },
                        label = "Sek.",
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        PrimaryButton(
            text = if (ex.isCardio) "Erledigt" else "Satz beenden",
            onClick = viewModel::completeSet,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PausePhase(state: WorkoutSessionUiState, onSkip: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Pause", color = TextMuted, style = MaterialTheme.typography.titleLarge)
        Text(formatWorkoutTime(state.pauseSeconds ?: 0), style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        SecondaryButton(text = "Überspringen", onClick = onSkip)
    }
}

@Composable
private fun RatePhase(state: WorkoutSessionUiState, viewModel: WorkoutSessionViewModel) {
    val ex = state.activeExercise ?: return
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(ex.name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
        Text("Wie war die Übung?", color = TextSecondary)
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            RATINGS.forEach { (value, emoji) ->
                Text(
                    emoji,
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier
                        .background(
                            if (ex.rating == value) Indigo.copy(alpha = 0.15f) else androidx.compose.ui.graphics.Color.Transparent,
                            RoundedCornerShape(8.dp),
                        )
                        .clickableRating { viewModel.setRating(value) }
                        .padding(8.dp),
                )
            }
        }
        PrimaryButton(
            text = if (state.isLastExercise) "Abschließen" else "Weiter →",
            onClick = viewModel::nextExercise,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

private fun Modifier.clickableRating(onClick: () -> Unit): Modifier =
    this.clickable(onClick = onClick)

@Composable
private fun SummaryPhase(state: WorkoutSessionUiState, viewModel: WorkoutSessionViewModel, onFinish: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Training abgeschlossen! 🎉", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        Text(
            "${formatWorkoutTime(state.elapsedSeconds)} · ${state.totalCompletedSets} Sätze",
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary,
        )
        AppTextField(
            value = state.sessionNotes,
            onValueChange = viewModel::setSessionNotes,
            label = "Trainingskommentar (optional)",
            placeholder = "Wie lief das Training?",
            singleLine = false,
            minLines = 3,
        )
        PrimaryButton(
            text = if (state.saving) "Wird gespeichert…" else "Training speichern",
            onClick = onFinish,
            enabled = !state.saving,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
