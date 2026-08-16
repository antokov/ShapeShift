package com.example.shapeshift.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
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
import com.example.shapeshift.data.model.WeightEntry
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppCard
import com.example.shapeshift.ui.components.AppTextField
import com.example.shapeshift.ui.components.ChipFlowRow
import com.example.shapeshift.ui.components.DangerButton
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.components.SecondaryButton
import com.example.shapeshift.ui.components.SelectChip
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Indigo
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@androidx.compose.foundation.layout.ExperimentalLayoutApi
@Composable
fun ProfileScreen() {
    val container = rememberAppContainer()
    val viewModel: ProfileViewModel = viewModel(
        factory = SimpleViewModelFactory { ProfileViewModel(container.profileRepository) }
    )
    val state by viewModel.uiState.collectAsState()
    val weightInput by viewModel.weightInput.collectAsState()
    val dateInput by viewModel.dateInput.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column {
            Text("Mein Profil", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
            Text(
                "Deine persönlichen Angaben werden lokal gespeichert.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted,
            )
        }

        // Persönliche Daten
        AppCard(modifier = Modifier.fillMaxWidth()) {
            SectionTag("Persönliche Daten")
            Text("Über mich", style = MaterialTheme.typography.titleLarge, color = TextPrimary)

            AppTextField(
                value = state.profile.vorname,
                onValueChange = viewModel::setVorname,
                label = "Vorname",
                placeholder = "z. B. Max",
            )
            AppTextField(
                value = state.profile.geburtsdatum ?: "",
                onValueChange = viewModel::setGeburtsdatum,
                label = "Geburtstag (JJJJ-MM-TT)",
            )
            computeAge(state.profile.geburtsdatum)?.let {
                Text("Alter: $it Jahre", style = MaterialTheme.typography.labelMedium, color = TextMuted)
            }
            AppTextField(
                value = state.profile.groesse?.toString() ?: "",
                onValueChange = viewModel::setGroesse,
                label = "Körpergröße (cm)",
                placeholder = "175",
                keyboardType = KeyboardType.Number,
            )
            val currentWeight = state.weightEntries.firstOrNull()
            Text(
                if (currentWeight != null) "Aktuelles Gewicht: ${currentWeight.weight} kg (${formatWeightDate(currentWeight.date)})"
                else "Aktuelles Gewicht: im Gewichtsverlauf unten eintragen",
                style = MaterialTheme.typography.labelMedium,
                color = TextMuted,
            )

            Text("Geschlecht", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            ChipFlowRow {
                GESCHLECHT_OPTIONS.forEach { option ->
                    SelectChip(
                        label = option,
                        active = state.profile.geschlecht == option,
                        onClick = { viewModel.setGeschlecht(if (state.profile.geschlecht == option) null else option) },
                    )
                }
            }
        }

        // Ziele
        AppCard(modifier = Modifier.fillMaxWidth()) {
            SectionTag("Ziele")
            Text("Meine Trainingsziele", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text("Wähle alle Ziele aus, die für dich zutreffen.", style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            ChipFlowRow {
                ZIELE_OPTIONS.forEach { ziel ->
                    SelectChip(
                        label = ziel,
                        active = state.profile.ziele.contains(ziel),
                        onClick = { viewModel.toggleZiel(ziel) },
                    )
                }
            }
        }

        // Trainingsprofil
        AppCard(modifier = Modifier.fillMaxWidth()) {
            SectionTag("Trainingsprofil")
            Text("Mein Trainingsstand", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text("Erfahrungsstufe", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            ChipFlowRow {
                ERFAHRUNGSSTUFEN.forEach { stufe ->
                    SelectChip(
                        label = stufe,
                        active = state.profile.erfahrungsstufe == stufe,
                        onClick = { viewModel.setErfahrungsstufe(if (state.profile.erfahrungsstufe == stufe) null else stufe) },
                    )
                }
            }
            AppTextField(
                value = state.profile.trainingsTageProWoche?.toString() ?: "",
                onValueChange = viewModel::setTrainingstage,
                label = "Trainingstage / Woche",
                placeholder = "3",
                keyboardType = KeyboardType.Number,
            )
            AppTextField(
                value = state.profile.verletzungen,
                onValueChange = viewModel::setVerletzungen,
                label = "Verletzungen / Einschränkungen",
                placeholder = "z. B. linke Schulter, kein Overhead-Drücken",
                singleLine = false,
                minLines = 3,
            )
        }

        // Equipment
        AppCard(modifier = Modifier.fillMaxWidth()) {
            SectionTag("Equipment")
            Text("Mein Equipment", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text("Wähle alles aus, was dir zur Verfügung steht.", style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            ChipFlowRow {
                EQUIPMENT_OPTIONS.forEach { option ->
                    SelectChip(
                        label = option.label,
                        active = state.profile.equipment.contains(option.value),
                        onClick = { viewModel.toggleEquipment(option.value) },
                    )
                }
            }
        }

        // Gewichtsverlauf
        AppCard(modifier = Modifier.fillMaxWidth()) {
            SectionTag("Körper")
            Text("Gewichtsverlauf", style = MaterialTheme.typography.titleLarge, color = TextPrimary)

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AppTextField(
                    value = weightInput,
                    onValueChange = viewModel::setWeightInput,
                    label = "Gewicht (kg)",
                    placeholder = "75.0",
                    keyboardType = KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
                AppTextField(
                    value = dateInput,
                    onValueChange = viewModel::setDateInput,
                    label = "Datum",
                    modifier = Modifier.weight(1f),
                )
            }
            PrimaryButton(
                text = "Eintragen",
                onClick = viewModel::addWeightEntry,
                enabled = weightInput.toDoubleOrNull()?.let { it > 0 } == true,
            )

            if (state.weightEntries.isEmpty()) {
                Text("Noch keine Einträge. Trage dein erstes Gewicht ein.", color = TextMuted, style = MaterialTheme.typography.bodyMedium)
            } else {
                var pendingDelete by remember { mutableStateOf<WeightEntry?>(null) }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    state.weightEntries.take(10).forEach { entry ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(formatWeightDate(entry.date), color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
                            Text("${entry.weight} kg", color = TextPrimary, style = MaterialTheme.typography.titleMedium)
                            DangerButton(text = "✕", onClick = { pendingDelete = entry })
                        }
                    }
                }
                pendingDelete?.let { entry ->
                    AlertDialog(
                        onDismissRequest = { pendingDelete = null },
                        title = { Text("Eintrag löschen?") },
                        text = { Text("Gewichtseintrag vom ${formatWeightDate(entry.date)} wirklich löschen?") },
                        confirmButton = {
                            DangerButton(text = "Löschen", onClick = {
                                viewModel.removeWeightEntry(entry.date)
                                pendingDelete = null
                            })
                        },
                        dismissButton = { SecondaryButton(text = "Abbrechen", onClick = { pendingDelete = null }) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionTag(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = Indigo,
    )
}

private fun formatWeightDate(dateStr: String): String = runCatching {
    val date = LocalDate.parse(dateStr)
    DateTimeFormatter.ofPattern("d. MMM yyyy", Locale.GERMAN).format(date)
}.getOrDefault(dateStr)
