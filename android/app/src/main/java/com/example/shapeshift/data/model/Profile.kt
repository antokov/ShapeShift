package com.example.shapeshift.data.model

import kotlinx.serialization.Serializable

/** Kotlin port of the profile shape in src/hooks/useProfile.js. */
@Serializable
data class Profile(
    val vorname: String = "",
    val geburtsdatum: String? = null,
    val geschlecht: String? = null,
    val groesse: Int? = null,
    val ziele: List<String> = emptyList(),
    val equipment: List<String> = emptyList(),
    val erfahrungsstufe: String? = null,
    val trainingsTageProWoche: Int? = null,
    val verletzungen: String = "",
)

/** Kotlin port of src/hooks/useWeightLog.js entries. */
@Serializable
data class WeightEntry(val date: String, val weight: Double)
