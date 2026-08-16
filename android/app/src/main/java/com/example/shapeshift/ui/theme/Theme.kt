package com.example.shapeshift.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// The web app is light-theme only (see CLAUDE.md Design System) — no dark
// mode / dynamic color branching here, to keep visual parity with the web UI.
private val AppColorScheme = lightColorScheme(
    primary = OrangeStart,
    onPrimary = Surface,
    secondary = Indigo,
    onSecondary = Surface,
    tertiary = Teal,
    background = PageBackground,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = PageBackground,
    onSurfaceVariant = TextSecondary,
    outline = Border,
    error = Danger,
    onError = Surface,
)

@Composable
fun ShapeShiftTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AppColorScheme,
        typography = Typography,
        content = content
    )
}
