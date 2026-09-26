package com.heyganba;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertTrue;

class BCryptTest {

    @Test
    void testBCrypt() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String raw = "Admin@HeyGanba2026!";
        String encoded = encoder.encode(raw);
        System.out.println("BCRYPT_HASH_OUTPUT: " + encoded);
        assertTrue(encoder.matches(raw, encoded));
    }
}
