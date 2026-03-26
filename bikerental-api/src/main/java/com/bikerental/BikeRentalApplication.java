package com.bikerental;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * BikeRental API – Spring Boot Application Entry Point
 * ─────────────────────────────────────────────────────
 * REST API for Online Bike Rental System
 * Database: MongoDB Atlas
 * Auth:     JWT (Bearer Token)
 * Port:     8080
 */
@SpringBootApplication
public class BikeRentalApplication {

    public static void main(String[] args) {
        SpringApplication.run(BikeRentalApplication.class, args);
        System.out.println("\n====================================");
        System.out.println("  BikeRental API is running!");
        System.out.println("  http://localhost:8080/api");
        System.out.println("====================================\n");
    }
}
