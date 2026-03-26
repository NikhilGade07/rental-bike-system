package com.bikerental.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;
    private String userId;
    private String bikeId;
    private String bikeName;
    private String bikeEmoji;
    private String unit;
    private int duration;
    private double totalCost;
    private BookingStatus status = BookingStatus.CONFIRMED;

    @CreatedDate
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime returnedAt;

    public enum BookingStatus { CONFIRMED, RETURNED, CANCELLED }

    public Booking() {}
    public Booking(String userId, String bikeId, String bikeName, String bikeEmoji, String unit, int duration, double totalCost) {
        this.userId = userId; this.bikeId = bikeId; this.bikeName = bikeName; this.bikeEmoji = bikeEmoji;
        this.unit = unit; this.duration = duration; this.totalCost = totalCost;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getBikeId() { return bikeId; }
    public void setBikeId(String bikeId) { this.bikeId = bikeId; }
    public String getBikeName() { return bikeName; }
    public void setBikeName(String bikeName) { this.bikeName = bikeName; }
    public String getBikeEmoji() { return bikeEmoji; }
    public void setBikeEmoji(String bikeEmoji) { this.bikeEmoji = bikeEmoji; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }
    public double getTotalCost() { return totalCost; }
    public void setTotalCost(double totalCost) { this.totalCost = totalCost; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getReturnedAt() { return returnedAt; }
    public void setReturnedAt(LocalDateTime returnedAt) { this.returnedAt = returnedAt; }
}
