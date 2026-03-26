package com.bikerental.seeder;

import com.bikerental.model.Bike;
import com.bikerental.model.User;
import com.bikerental.repository.BikeRepository;
import com.bikerental.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final BikeRepository bikeRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, BikeRepository bikeRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.bikeRepository = bikeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedAdmin();
        seedBikes();
    }

    private void seedAdmin() {
        if (userRepository.findByEmail("admin@bikerental.com").isEmpty()) {
            User admin = new User(
                    "Admin",
                    "admin@bikerental.com",
                    passwordEncoder.encode("admin123"),
                    "admin"
            );
            userRepository.save(admin);
            log.info("[Seed] Admin account created → admin@bikerental.com / admin123");
        }
    }

    private void seedBikes() {
        if (bikeRepository.count() == 0) {
            List<Bike> bikes = List.of(
                    new Bike("Trailblazer X9", "Mountain", 5.50, List.of("Suspension", "Disc Brakes", "Helmet"), "🚵"),
                    new Bike("SpeedPro 700C", "Road", 4.00, List.of("Lightweight", "Clipless Pedals"), "🚴"),
                    new Bike("CityGlide 3S", "City", 3.00, List.of("Basket", "Fender", "Bell", "Lock"), "🚲"),
                    new Bike("VoltRide e-500", "Electric", 8.00, List.of("500W Motor", "GPS", "USB Charge", "Helmet"), "⚡"),
                    new Bike("GravelKing Pro", "Mountain", 6.00, List.of("Tubeless", "Dropper Post", "GPS"), "🚵"),
                    new Bike("UrbanFlow Classic", "City", 2.50, List.of("7-Speed", "Fender", "Lights", "Lock"), "🚲")
            );
            bikeRepository.saveAll(bikes);
            log.info("[Seed] {} demo bikes created.", bikes.size());
        }
    }
}
