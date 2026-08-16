package com.example.shapeshift.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.shapeshift.ui.theme.Danger
import com.example.shapeshift.ui.theme.DangerMuted
import com.example.shapeshift.ui.theme.FieldBorder
import com.example.shapeshift.ui.theme.OrangeEnd
import com.example.shapeshift.ui.theme.OrangeStart
import com.example.shapeshift.ui.theme.Surface
import com.example.shapeshift.ui.theme.TextPrimary
import com.example.shapeshift.ui.theme.TextSecondary

private val ButtonShape = RoundedCornerShape(8.dp)

/** ONE per screen — the main action. Orange gradient, matches .btn--primary. */
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    androidx.compose.material3.Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.background(
            brush = Brush.horizontalGradient(listOf(OrangeStart, OrangeEnd)),
            shape = ButtonShape,
        ),
        shape = ButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = Surface,
            disabledContainerColor = Color.Transparent,
        ),
        elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
    ) {
        Text(text, maxLines = 1, softWrap = false, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
    }
}

/** Neutral actions (Edit, secondary nav). White bg, light border. */
@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier,
        shape = ButtonShape,
        border = BorderStroke(1.dp, FieldBorder),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Surface,
            contentColor = TextPrimary,
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Text(text, maxLines = 1, softWrap = false, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
    }
}

/** Navigation (Back), Cancel. Transparent, muted text. */
@Composable
fun GhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    TextButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier,
        shape = ButtonShape,
        colors = ButtonDefaults.textButtonColors(contentColor = TextSecondary),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(text, maxLines = 1, softWrap = false, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
    }
}

/** Destructive actions (Delete). Red muted bg, red text. */
@Composable
fun DangerButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    androidx.compose.material3.Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier,
        shape = ButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = DangerMuted,
            contentColor = Danger,
        ),
        elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Text(text, maxLines = 1, softWrap = false, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
    }
}
