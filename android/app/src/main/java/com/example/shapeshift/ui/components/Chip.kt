package com.example.shapeshift.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.shapeshift.ui.theme.Border
import com.example.shapeshift.ui.theme.Indigo
import com.example.shapeshift.ui.theme.IndigoMuted
import com.example.shapeshift.ui.theme.Surface
import com.example.shapeshift.ui.theme.TextSecondary

/** Selectable pill chip — matches the web .chip / .chip--active styling. */
@Composable
fun SelectChip(label: String, active: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(50)
    Text(
        text = label,
        style = MaterialTheme.typography.bodyMedium,
        color = if (active) Indigo else TextSecondary,
        maxLines = 1,
        modifier = Modifier
            .background(if (active) IndigoMuted else Surface, shape)
            .border(BorderStroke(1.dp, if (active) Indigo else Border), shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

@androidx.compose.foundation.layout.ExperimentalLayoutApi
@Composable
fun ChipFlowRow(content: @Composable () -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        content()
    }
}
