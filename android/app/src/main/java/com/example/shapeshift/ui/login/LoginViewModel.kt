package com.example.shapeshift.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shapeshift.data.auth.AuthManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val error: String? = null,
    val loading: Boolean = false,
)

/** Port of src/pages/LoginView.jsx. */
class LoginViewModel(private val authManager: AuthManager) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.value = _uiState.value.copy(username = value)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value)
    }

    fun login(onSuccess: (String) -> Unit) {
        val state = _uiState.value
        if (state.username.isBlank() || state.password.isEmpty()) return
        _uiState.value = state.copy(loading = true, error = null)
        viewModelScope.launch {
            val result = authManager.login(state.username.trim(), state.password)
            result.onSuccess { username ->
                _uiState.value = _uiState.value.copy(loading = false)
                onSuccess(username)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(loading = false, error = e.message)
            }
        }
    }
}
