package com.example.shapeshift.ui.routines.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.shapeshift.data.model.Exercise
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.components.GhostButton
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.components.SecondaryButton
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Indigo
import com.example.shapeshift.ui.theme.IndigoMuted
import com.example.shapeshift.ui.theme.NeutralChipBackground
import com.example.shapeshift.ui.theme.NeutralChipText
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.Teal
import com.example.shapeshift.ui.theme.TealMuted
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary

@Composable
fun RoutineDetailScreen(
    routineId: String,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onStartWorkout: () -> Unit,
) {
    val container = rememberAppContainer()
    val routines by container.routineRepository.routines.collectAsState()
    val routine = routines.find { it.id == routineId }

    if (routine == null) {
        Column(
            Modifier.fillMaxSize().background(PageBackground).padding(16.dp),
        ) {
            GhostButton(text = "← Zurück", onClick = onBack)
            Text("Routine wird geladen…", color = TextMuted)
        }
        return
    }

    var expandedId by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxSize().background(PageBackground).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        GhostButton(text = "← Zurück", onClick = onBack)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SecondaryButton(text = "Bearbeiten", onClick = onEdit)
            PrimaryButton(text = "Training starten", onClick = onStartWorkout)
        }

        Text(routine.name, style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        if (routine.description.isNotBlank()) {
            Text(routine.description, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
        }

        Text(
            "${routine.exercises.size} ${if (routine.exercises.size == 1) "Übung" else "Übungen"}",
            style = MaterialTheme.typography.labelMedium,
            color = TextMuted,
        )

        if (routine.exercises.isEmpty()) {
            Text("Keine Übungen vorhanden.", color = TextMuted)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(routine.exercises, key = { it.id }) { exercise ->
                    ExerciseRow(
                        exercise = exercise,
                        isOpen = expandedId == exercise.id,
                        onToggle = { expandedId = if (expandedId == exercise.id) null else exercise.id },
                    )
                }
            }
        }
    }
}

@Composable
private fun ExerciseRow(exercise: Exercise, isOpen: Boolean, onToggle: () -> Unit) {
    val isCardio = exercise.durationMinutes != null
    AppCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onToggle,
    ) {
        Text(
            exercise.name,
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary,
            maxLines = 2,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (isCardio) {
                StatChip("${exercise.durationMinutes} min", Teal, TealMuted)
            } else {
                StatChip("${exercise.sets ?: 1} Sätze", NeutralChipText, NeutralChipBackground)
                if (exercise.duration != null) {
                    StatChip("${exercise.duration} Sek.", Indigo, IndigoMuted)
                } else {
                    StatChip("${exercise.reps ?: 0} Wdh.", Indigo, IndigoMuted)
                }
            }
        }
    }
}

@Composable
private fun StatChip(text: String, textColor: androidx.compose.ui.graphics.Color, bgColor: androidx.compose.ui.graphics.Color) {
    Text(
        text,
        color = textColor,
        style = MaterialTheme.typography.labelMedium,
        modifier = Modifier
            .background(bgColor, androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}
