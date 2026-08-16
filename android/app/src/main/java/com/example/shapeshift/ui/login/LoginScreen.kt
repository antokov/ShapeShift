package com.example.shapeshift.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.shapeshift.ui.SimpleViewModelFactory
import com.example.shapeshift.ui.components.AppTextField
import com.example.shapeshift.ui.components.PrimaryButton
import com.example.shapeshift.ui.rememberAppContainer
import com.example.shapeshift.ui.theme.Danger
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.TextPrimary

@Composable
fun LoginScreen(onLoginSuccess: (String) -> Unit) {
    val container = rememberAppContainer()
    val viewModel: LoginViewModel = viewModel(
        factory = SimpleViewModelFactory { LoginViewModel(container.authManager) }
    )
    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.widthIn(max = 360.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("⚡ ShapeShift", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text("Willkommen zurück", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)

            AppTextField(
                value = state.username,
                onValueChange = viewModel::onUsernameChange,
                label = "Benutzername",
            )
            AppTextField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                label = "Passwort",
                keyboardType = KeyboardType.Password,
                visualTransformation = PasswordVisualTransformation(),
            )

            state.error?.let {
                Text(it, color = Danger, style = MaterialTheme.typography.bodyMedium)
            }

            PrimaryButton(
                text = if (state.loading) "Anmelden…" else "Anmelden",
                onClick = { viewModel.login(onLoginSuccess) },
                enabled = !state.loading && state.username.isNotBlank() && state.password.isNotEmpty(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
