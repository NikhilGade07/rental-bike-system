package com.bikerental.service;

import com.bikerental.dto.BikeRequest;
import com.bikerental.model.Bike;
import com.bikerental.repository.BikeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BikeService {

    private final BikeRepository bikeRepository;

    public BikeService(BikeRepository bikeRepository) {
        this.bikeRepository = bikeRepository;
    }

    public List<Bike> getAll(String type, Boolean available) {
        if (type != null && available != null && available) return bikeRepository.findByTypeAndAvailableTrue(type);
        if (type != null) return bikeRepository.findByType(type);
        if (Boolean.TRUE.equals(available)) return bikeRepository.findByAvailableTrue();
        return bikeRepository.findAll();
    }

    public Bike getById(String id) {
        return bikeRepository.findById(id).orElseThrow(() -> new RuntimeException("Bike not found."));
    }

    public Bike create(BikeRequest req) {
        validateType(req.getType());
        Bike bike = new Bike(
                req.getName().trim(),
                req.getType(),
                req.getPricePerHour(),
                req.getFeatures() != null ? req.getFeatures() : List.of(),
                req.getEmoji() != null && !req.getEmoji().isBlank() ? req.getEmoji() : "🚲"
        );
        return bikeRepository.save(bike);
    }

    public Bike update(String id, BikeRequest req) {
        Bike bike = getById(id);
        validateType(req.getType());
        bike.setName(req.getName().trim());
        bike.setType(req.getType());
        bike.setPricePerHour(req.getPricePerHour());
        if (req.getFeatures() != null) bike.setFeatures(req.getFeatures());
        if (req.getEmoji() != null && !req.getEmoji().isBlank()) bike.setEmoji(req.getEmoji());
        return bikeRepository.save(bike);
    }

    public void delete(String id) {
        if (!bikeRepository.existsById(id)) throw new RuntimeException("Bike not found.");
        bikeRepository.deleteById(id);
    }

    public Bike setAvailability(String id, boolean available) {
        Bike bike = getById(id);
        bike.setAvailable(available);
        return bikeRepository.save(bike);
    }

    public long countTotal() { return bikeRepository.count(); }
    public long countAvailable() { return bikeRepository.countByAvailableTrue(); }

    private void validateType(String type) {
        if (!List.of("Mountain", "Road", "City", "Electric").contains(type))
            throw new IllegalArgumentException("Type must be: Mountain, Road, City, or Electric.");
    }
}
