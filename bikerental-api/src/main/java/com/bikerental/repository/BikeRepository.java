package com.bikerental.repository;

import com.bikerental.model.Bike;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BikeRepository – Spring Data MongoDB
 */
@Repository
public interface BikeRepository extends MongoRepository<Bike, String> {

    List<Bike> findByAvailableTrue();

    List<Bike> findByType(String type);

    List<Bike> findByTypeAndAvailableTrue(String type);

    long countByAvailableTrue();
}
