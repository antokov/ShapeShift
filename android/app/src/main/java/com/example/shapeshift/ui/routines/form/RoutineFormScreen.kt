package com.example.shapeshift.ui.routines.form

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.components.AppTextField
import com.example.shapeshift.ui.components.DangerButton
import com.example.shapeshift.ui.components.GhostButton
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.components.SecondaryButton
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Danger
import com.example.shapeshift.ui.theme.Indigo
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.Surface
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary

@Composable
fun RoutineFormScreen(
    existing: Routine?,
    onSaved: () -> Unit,
    onCancel: () -> Unit,
) {
    val container = rememberAppContainer()
    val viewModel: RoutineFormViewModel = viewModel(
        factory = SimpleViewModelFactory { RoutineFormViewModel(container.routineRepository, existing) }
    )
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier.fillMaxSize().background(PageBackground).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GhostButton(text = "← Zurück", onClick = onCancel)
            Text(
                if (state.isEdit) "Routine bearbeiten" else "Neue Routine",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
            )
        }

        RoutineTypeToggle(current = state.routineType, onChange = viewModel::setRoutineType)

        AppTextField(
            value = state.name,
            onValueChange = viewModel::setName,
            label = "Name *",
            isError = state.submitted && state.nameError != null,
            errorText = state.nameError,
            placeholder = "z. B. Push Day",
        )

        AppTextField(
            value = state.description,
            onValueChange = viewModel::setDescription,
            label = "Beschreibung",
            placeholder = "Optional",
            singleLine = false,
            minLines = 2,
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (state.routineType == "cardio") "Cardio-Übungen" else "Übungen",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
            )
            SecondaryButton(text = "+ Übung", onClick = viewModel::addExercise)
        }

        if (state.submitted && state.exercisesError != null) {
            Text(state.exercisesError!!, color = Danger, style = MaterialTheme.typography.labelMedium)
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(state.exercises, key = { it.id }) { row ->
                ExerciseFormRowView(
                    row = row,
                    routineType = state.routineType,
                    submitted = state.submitted,
                    onChange = { transform -> viewModel.updateExercise(row.id, transform) },
                    onRemove = { viewModel.removeExercise(row.id) },
                )
            }
        }

        state.saveError?.let {
            Text(it, color = Danger, style = MaterialTheme.typography.bodyMedium)
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SecondaryButton(text = "Abbrechen", onClick = onCancel, modifier = Modifier.weight(1f))
            PrimaryButton(
                text = if (state.saving) "Speichern…" else "Speichern",
                onClick = { viewModel.save(onSaved) },
                enabled = !state.saving,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun RoutineTypeToggle(current: String, onChange: (String) -> Unit) {
    Row(
        modifier = Modifier
            .background(PageBackground, RoundedCornerShape(8.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        ToggleChip("Kraft", current == "strength") { onChange("strength") }
        ToggleChip("Cardio", current == "cardio") { onChange("cardio") }
    }
}

@Composable
private fun ToggleChip(label: String, active: Boolean, onClick: () -> Unit) {
    Text(
        label,
        color = if (active) Surface else TextSecondary,
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier
            .background(if (active) Indigo else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(6.dp))
            .clickableCompat(onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

private fun Modifier.clickableCompat(onClick: () -> Unit): Modifier =
    this.clickable(onClick = onClick)

@Composable
private fun ExerciseFormRowView(
    row: ExerciseFormRow,
    routineType: String,
    submitted: Boolean,
    onChange: ((ExerciseFormRow) -> ExerciseFormRow) -> Unit,
    onRemove: () -> Unit,
) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        if (routineType == "strength") {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Wiederholungen",
                    color = if (!row.useDuration) Indigo else TextSecondary,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.clickableCompat { onChange { it.copy(useDuration = false) } },
                )
                Text(
                    "Dauer",
                    color = if (row.useDuration) Indigo else TextSecondary,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.clickableCompat { onChange { it.copy(useDuration = true) } },
                )
            }
        }

        AppTextField(
            value = row.name,
            onValueChange = { v -> onChange { it.copy(name = v) } },
            label = "Übung",
            isError = submitted && row.nameError != null,
            errorText = row.nameError,
            placeholder = "z. B. Kniebeuge",
        )

        if (routineType == "cardio") {
            AppTextField(
                value = row.durationMinutes,
                onValueChange = { v -> onChange { it.copy(durationMinutes = v) } },
                label = "Min.",
                isError = submitted && row.valueError != null,
                errorText = row.valueError,
                keyboardType = KeyboardType.Number,
            )
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AppTextField(
                    value = row.sets,
                    onValueChange = { v -> onChange { it.copy(sets = v) } },
                    label = "Sätze",
                    keyboardType = KeyboardType.Number,
                    modifier = Modifier.weight(1f),
                )
                if (!row.useDuration) {
                    AppTextField(
                        value = row.reps,
                        onValueChange = { v -> onChange { it.copy(reps = v) } },
                        label = "Wdh.",
                        isError = submitted && row.valueError != null,
                        errorText = row.valueError,
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                    )
                } else {
                    AppTextField(
                        value = row.duration,
                        onValueChange = { v -> onChange { it.copy(duration = v) } },
                        label = "Sek.",
                        isError = submitted && row.valueError != null,
                        errorText = row.valueError,
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        DangerButton(text = "✕ Entfernen", onClick = onRemove)
    }
}
