package com.bikerental.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "bikes")
public class Bike {
    @Id
    private String id;
    private String name;
    private String type;
    private double pricePerHour;
    private List<String> features = List.of();
    private String emoji = "🚲";
    private boolean available = true;

    @CreatedDate
    private LocalDateTime createdAt = LocalDateTime.now();

    public Bike() {}
    public Bike(String name, String type, double pricePerHour, List<String> features, String emoji) {
        this.name = name; this.type = type; this.pricePerHour = pricePerHour;
        if (features != null) this.features = features;
        if (emoji != null) this.emoji = emoji;
    }

    public double getPricePerDay() { return pricePerHour * 24; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public double getPricePerHour() { return pricePerHour; }
    public void setPricePerHour(double pricePerHour) { this.pricePerHour = pricePerHour; }
    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
