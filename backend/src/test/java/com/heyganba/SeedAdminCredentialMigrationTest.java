package com.heyganba;

import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.User;
import com.heyganba.model.enums.RoleName;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.*;

class SeedAdminCredentialMigrationTest extends ContentApiTestBase {
    @Autowired DataSource dataSource;
    private void migrate() {
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V34__disable_public_seed_admin_credential.sql")).execute(dataSource);
    }
    private User seed(String hash) {
        Role role = roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).build());
        return userRepository.save(User.builder().email("admin@heyganba.vn").fullName("Test Admin")
                .passwordHash(hash).role(role).isActive(true).build());
    }
    @Test void publicSampleCredentialIsDisabledAndTokensInvalidated() {
        User user = seed("$2a$10$lc2gbEBnoKI7XBTTQBOffePZpp5xTWeOPFAeLCc9rC.yr/ip9al6y");
        migrate();
        User result = userRepository.findById(user.getId()).orElseThrow();
        assertFalse(result.getIsActive()); assertEquals(1, result.getTokenVersion());
    }
    @Test void previouslyChangedAdminCredentialRemainsActive() {
        User user = seed(passwordEncoder.encode("PrivateTestCredential456!"));
        migrate();
        User result = userRepository.findById(user.getId()).orElseThrow();
        assertTrue(result.getIsActive()); assertEquals(0, result.getTokenVersion());
    }
}
