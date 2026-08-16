package com.example.shapeshift.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.shapeshift.AppContainer
import com.example.shapeshift.ShapeShiftApplication

/** Minimal manual-DI ViewModel factory — avoids pulling in Hilt for a small app. */
class SimpleViewModelFactory<T : ViewModel>(private val creator: () -> T) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM = creator() as VM
}

@Composable
fun rememberAppContainer(): AppContainer {
    val context = LocalContext.current.applicationContext as ShapeShiftApplication
    return context.container
}
