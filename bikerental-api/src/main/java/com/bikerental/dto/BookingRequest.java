package com.bikerental.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class BookingRequest {
    @NotBlank(message = "Bike ID is required")
    private String bikeId;

    @NotBlank(message = "Unit is required")
    @Pattern(regexp = "hours|days", message = "Unit must be 'hours' or 'days'")
    private String unit;

    @Min(value = 1, message = "Duration must be at least 1")
    private int duration;

    public String getBikeId() { return bikeId; }
    public void setBikeId(String bikeId) { this.bikeId = bikeId; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }
}
