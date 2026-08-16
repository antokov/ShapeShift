package com.example.shapeshift.ui.routines.list

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.components.DangerButton
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.components.SecondaryButton
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Green
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary
import kotlinx.coroutines.launch

@Composable
fun RoutineListScreen(
    onNew: () -> Unit,
    onView: (String) -> Unit,
    onEdit: (String) -> Unit,
) {
    val container = rememberAppContainer()
    val viewModel: RoutineListViewModel = viewModel(
        factory = SimpleViewModelFactory { RoutineListViewModel(container.routineRepository) }
    )
    val routines by viewModel.routines.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val importStatus by viewModel.importStatus.collectAsState()
    val importing by viewModel.importing.collectAsState()

    var pendingDelete by remember { mutableStateOf<Routine?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val text = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            if (text != null) viewModel.importFromJson(text)
        }
    }

    LaunchedEffect(importStatus) {
        if (importStatus != null) {
            kotlinx.coroutines.delay(4000)
            viewModel.clearImportStatus()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Meine Routinen", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SecondaryButton(
                text = if (importing) "Importieren…" else "↑ Import",
                onClick = { filePicker.launch("application/json") },
                enabled = !importing,
            )
            PrimaryButton(text = "+ Neu", onClick = onNew)
        }

        importStatus?.let { status ->
            Text(
                status.message,
                color = if (status.success) Green else MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        when {
            loading -> Text("Routinen werden geladen…", color = TextMuted)
            routines.isEmpty() -> EmptyState(onNew)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(routines, key = { it.id }) { routine ->
                    RoutineCard(
                        routine = routine,
                        onView = { onView(routine.id) },
                        onEdit = { onEdit(routine.id) },
                        onDelete = { pendingDelete = routine },
                    )
                }
            }
        }
    }

    pendingDelete?.let { routine ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Routine löschen?") },
            text = { Text("„${routine.name}\" wirklich löschen?") },
            confirmButton = {
                DangerButton(text = "Löschen", onClick = {
                    viewModel.deleteRoutine(routine.id)
                    pendingDelete = null
                })
            },
            dismissButton = {
                SecondaryButton(text = "Abbrechen", onClick = { pendingDelete = null })
            },
        )
    }
}

@Composable
private fun EmptyState(onNew: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Noch keine Routinen", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
        Text(
            "Erstelle deine erste Trainingsroutine oder importiere Routinen aus einer JSON-Datei.",
            color = TextMuted,
            style = MaterialTheme.typography.bodyMedium,
        )
        PrimaryButton(text = "+ Neue Routine", onClick = onNew)
    }
}

@Composable
private fun RoutineCard(
    routine: Routine,
    onView: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val isCardio = routine.routineType == "cardio"
    val badge = if (isCardio) {
        "${routine.exercises.sumOf { it.durationMinutes ?: 0 }} min"
    } else {
        "${routine.exercises.size} ${if (routine.exercises.size == 1) "Übung" else "Übungen"}"
    }

    AppCard(modifier = Modifier.fillMaxWidth(), onClick = onView) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(badge, style = MaterialTheme.typography.labelMedium, color = TextSecondary)
            if (isCardio) Text("· Cardio", style = MaterialTheme.typography.labelMedium, color = com.example.shapeshift.ui.theme.Teal)
        }
        Text(routine.name, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
        if (routine.description.isNotBlank()) {
            Text(routine.description, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
        }
        Spacer(Modifier.padding(top = 4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SecondaryButton(text = "Bearbeiten", onClick = onEdit)
            Spacer(Modifier.padding(horizontal = 4.dp))
            DangerButton(text = "Löschen", onClick = onDelete)
        }
    }
}
