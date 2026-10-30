package com.heyganba.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Narrow initial bootstrap, NOT a general migration runner or content-release gate. */
public final class JiayouBootstrapGuard {
    static final String LOCATION = "classpath:db/jiayou-production";
    static final String SCRIPT = "V1__jiayou_schema_only.sql";
    static final String LINEAGE = "jiayou-schema-only-v1";
    static final String SCHEMA_SHA256 = "0db6d6081357696b38526659833a24091c2861e7b1d71540857dfd9e16a96bfb";
    private final Environment environment;

    public JiayouBootstrapGuard(Environment environment) {
        this.environment = environment;
    }

    private static void require(boolean valid, String condition) {
        if (!valid) throw new IllegalStateException("Jiayou bootstrap blocked: " + condition);
    }

    private static String value(Environment e, String key) {
        String result = e.getProperty(key, "");
        require(!result.isBlank(), "missing " + key);
        return result;
    }

    public static void validateEnvironment(Environment e) {
        require(Arrays.equals(e.getActiveProfiles(), new String[]{"jiayou-prod"}), "exclusive jiayou-prod profile required");
        require(value(e, "JIAYOU_PRODUCT").equals("Jiayou"), "product identity");
        require(value(e, "JIAYOU_ENVIRONMENT").equals("production"), "environment identity");
        String id = value(e, "JIAYOU_TARGET_ID");
        require(UUID.fromString(id).toString().equals(id), "canonical UUID target identity");
        String mode = value(e, "JIAYOU_BOOTSTRAP_MODE");
        require(Set.of("initialize", "validate").contains(mode), "explicit initialize or validate mode");
        require(value(e, "JIAYOU_BOOTSTRAP_AUTHORIZATION").equals(mode + ":Jiayou:production:" + id), "target-bound authorization");
        String url = value(e, "JIAYOU_DATABASE_URL");
        require(url.startsWith("jdbc:postgresql://"), "explicit PostgreSQL URL");
        URI uri = URI.create(url.substring(5));
        require(uri.getUserInfo() == null && url.indexOf('#') < 0 && uri.getHost() != null, "single explicit database host");
        require(uri.getHost().equals(value(e, "JIAYOU_DATABASE_HOST")), "configured database host identity");
        require(uri.getPort() == Integer.parseInt(value(e, "JIAYOU_DATABASE_PORT")), "explicit database port identity");
        String db = value(e, "JIAYOU_DATABASE_NAME");
        require(db.matches("jiayou_[a-z0-9_]+") && uri.getPath().equals("/" + db), "independent database name");
        require(uri.getQuery() == null || Set.of("sslmode=require", "sslmode=verify-full").contains(uri.getQuery()), "no JDBC session/init options");
        require(value(e, "JIAYOU_DATABASE_USER").matches("[a-z_][a-z0-9_]*"), "explicit database role");
        value(e, "JIAYOU_DATABASE_PASSWORD");
        require(url.equals(value(e, "spring.datasource.url")) && url.equals(value(e, "spring.flyway.url")), "no datasource/Flyway fallback or alternate target");
        for (String prefix : new String[]{"spring.datasource.", "spring.flyway."}) {
            String user = prefix.equals("spring.flyway.") ? "user" : "username";
            require(value(e, prefix + user).equals(value(e, "JIAYOU_DATABASE_USER")), "datasource role binding");
            require(value(e, prefix + "password").equals(value(e, "JIAYOU_DATABASE_PASSWORD")), "datasource credential binding");
        }
        require(value(e, "spring.flyway.locations").equals(LOCATION), "unexpected migration location");
        require(value(e, "spring.flyway.enabled").equals("true"), "Flyway cannot be disabled");
        require(value(e, "spring.flyway.baseline-on-migrate").equals("false"), "baseline forbidden");
        require(value(e, "spring.flyway.clean-disabled").equals("true"), "clean forbidden");
        require(value(e, "spring.jpa.hibernate.ddl-auto").equals("validate"), "Hibernate must validate only");
        require(value(e, "spring.sql.init.mode").equals("never"), "SQL init forbidden");
        require(e.getProperty("spring.jpa.properties.hibernate.hbm2ddl.auto", "validate").equals("validate")
                && !e.getProperty("spring.jpa.generate-ddl", "false").equals("true"), "alternate Hibernate DDL forbidden");
        for (String key : new String[]{"spring.datasource.hikari.connection-init-sql", "spring.flyway.init-sqls",
                "spring.jpa.properties.jakarta.persistence.schema-generation.database.action", "JIAYOU_ADMIN_PASSWORD", "JIAYOU_ADMIN_EMAIL"}) {
            require(e.getProperty(key, "").isEmpty(), "initialization/admin override forbidden: " + key);
        }
        String jwt = value(e, "JIAYOU_JWT_SECRET");
        require(jwt.equals(value(e, "app.jwt.secret")), "independent JWT binding");
        require(Base64.getDecoder().decode(jwt).length >= 32, "JWT key strength");
        require(!jwt.equals("404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"), "development JWT forbidden");
        String origins = value(e, "JIAYOU_CORS_ALLOWED_ORIGINS");
        require(origins.equals(value(e, "app.cors.allowed-origins")), "explicit independent CORS binding");
        for (String origin : origins.split(",", -1)) {
            URI parsed = URI.create(origin);
            require("https".equals(parsed.getScheme()) && parsed.getHost() != null && !origin.contains("*")
                    && !Set.of("heyganba.site", "www.heyganba.site").contains(parsed.getHost())
                    && parsed.getUserInfo() == null && parsed.getQuery() == null && origin.indexOf('#') < 0
                    && (parsed.getPath().isEmpty() || parsed.getPath().equals("/")), "isolated HTTPS origin required");
        }
    }

    public void run(Flyway flyway) {
        validateEnvironment(environment);
        Configuration c = flyway.getConfiguration();
        require(Arrays.stream(c.getLocations()).map(Object::toString).toList().equals(java.util.List.of(LOCATION)), "effective locations");
        require(!c.isBaselineOnMigrate() && c.isCleanDisabled() && !c.isCleanOnValidationError()
                && !c.isOutOfOrder() && c.isValidateOnMigrate() && !c.isSkipExecutingMigrations()
                && c.isExecuteInTransaction() && !c.isCreateSchemas(), "effective Flyway safety flags");
        require("jiayou_schema_history".equals(c.getTable()) && "public".equals(c.getDefaultSchema())
                && Arrays.equals(c.getSchemas(), new String[]{"public"}), "history/schema isolation");
        require(c.getCallbacks().length == 0 && c.getJavaMigrations().length == 0 && c.getResolvers().length == 0
                && c.getResourceProvider() == null && c.getJavaMigrationClassProvider() == null
                && (c.getInitSql() == null || c.getInitSql().isBlank()), "custom initialization forbidden");
        require(!c.isSkipDefaultResolvers() && c.getSqlMigrationPrefix().equals("V") && c.getSqlMigrationSeparator().equals("__")
                && Arrays.equals(c.getSqlMigrationSuffixes(), new String[]{".sql"}) && c.isPlaceholderReplacement()
                && c.getEncoding().equals(StandardCharsets.UTF_8) && c.getTarget().equals(org.flywaydb.core.api.MigrationVersion.LATEST)
                && c.getJdbcProperties().isEmpty(), "migration resolver/session overrides forbidden");
        require(c.getPlaceholders().equals(Map.of("jiayouTargetId", value(environment, "JIAYOU_TARGET_ID"))), "only target placeholder allowed");
        verifyManifest();
        try (Connection connection = c.getDataSource().getConnection()) {
            connection.setReadOnly(true);
            require(connection.getMetaData().getURL().equals(value(environment, "JIAYOU_DATABASE_URL")), "actual datasource URL");
            require(query(connection, "SELECT current_database()").equals(value(environment, "JIAYOU_DATABASE_NAME")), "actual database identity");
            require(query(connection, "SELECT current_user").equals(value(environment, "JIAYOU_DATABASE_USER")), "actual database role");
            // Session lock serializes our own initializers without creating an object.
            query(connection, "SELECT pg_advisory_lock(74196534012001)");
            try {
                if (value(environment, "JIAYOU_BOOTSTRAP_MODE").equals("initialize")) {
                    assertEmpty(connection);
                    flyway.migrate();
                } else {
                    verifyIdentity(connection);
                    require(query(connection, "SELECT count(*) FROM public.jiayou_schema_history WHERE version='1' AND script='" + SCRIPT + "' AND success").equals("1")
                            && query(connection, "SELECT count(*) FROM public.jiayou_schema_history").equals("1"), "unknown migration history");
                    require(query(connection, "SELECT count(*) FROM public.users WHERE email='admin@heyganba.vn'").equals("0"), "public seed administrator forbidden");
                    flyway.validate(); // Restarts cannot apply pending SQL or callbacks.
                }
                verifyIdentity(connection);
            } finally {
                query(connection, "SELECT pg_advisory_unlock(74196534012001)");
            }
        } catch (java.sql.SQLException ex) {
            // Never attach JDBC exception details, which may contain target credentials.
            throw new IllegalStateException("Jiayou bootstrap blocked: database inspection failed");
        }
    }

    private static void verifyManifest() {
        try {
            Resource[] resources = new PathMatchingResourcePatternResolver().getResources("classpath*:db/jiayou-production/**/*");
            require(resources.length == 1 && SCRIPT.equals(resources[0].getFilename()), "unapproved migration/content/callback resource");
            String sql = resources[0].getContentAsString(StandardCharsets.UTF_8).replace("\r\n", "\n");
            require(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(sql.getBytes(StandardCharsets.UTF_8)))
                    .equals(SCHEMA_SHA256), "unreviewed schema/content manifest");
        } catch (java.io.IOException | java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Jiayou bootstrap blocked: manifest unreadable");
        }
    }

    private static void assertEmpty(Connection connection) throws java.sql.SQLException {
        String userNamespace = "n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'";
        require(query(connection, "SELECT count(*) FROM pg_namespace n WHERE " + userNamespace + " AND n.nspname <> 'public'").equals("0"), "database has another schema");
        for (String catalog : new String[]{"pg_class", "pg_proc", "pg_type"}) {
            require(query(connection, "SELECT count(*) FROM " + catalog + " o JOIN pg_namespace n ON n.oid=o." + (catalog.equals("pg_type") ? "typnamespace" : catalog.equals("pg_proc") ? "pronamespace" : "relnamespace") + " WHERE " + userNamespace).equals("0"), "nonempty database, including legacy history");
        }
        require(query(connection, "SELECT count(*) FROM pg_extension WHERE extname <> 'plpgsql'").equals("0"), "nonempty extension inventory");
    }

    private void verifyIdentity(Connection connection) throws java.sql.SQLException {
        require(query(connection, "SELECT count(*) FROM public.jiayou_database_identity").equals("1"), "lineage marker cardinality");
        try (var statement = connection.prepareStatement("SELECT product,environment,target_id::text,lineage FROM public.jiayou_database_identity WHERE singleton" );
             ResultSet row = statement.executeQuery()) {
            require(row.next() && row.getString(1).equals("Jiayou") && row.getString(2).equals("production")
                    && row.getString(3).equals(value(environment, "JIAYOU_TARGET_ID")) && row.getString(4).equals(LINEAGE), "unknown or incompatible database lineage");
        }
    }

    private static String query(Connection connection, String sql) throws java.sql.SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            require(rows.next(), "missing database inspection result");
            return rows.getString(1);
        }
    }
}
