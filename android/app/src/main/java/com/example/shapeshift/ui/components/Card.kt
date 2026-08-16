package com.example.shapeshift.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.shapeshift.ui.theme.Border
import com.example.shapeshift.ui.theme.Surface

/** White surface, 1px light border, no shadow — matches globals.css card rules. */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    cornerRadius: androidx.compose.ui.unit.Dp = 12.dp,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(cornerRadius)
    var base = modifier
        .background(Surface, shape)
        .border(BorderStroke(1.dp, Border), shape)
    if (onClick != null) base = base.clickable(onClick = onClick)
    Column(
        modifier = base.padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        content = content,
    )
}
