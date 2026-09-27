# ==========================================
# Multi-stage Dockerfile for HeyGanba Backend
# ==========================================

# 1. Build Stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Install Maven & cache dependencies
RUN apk add --no-cache maven
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build
COPY src src
RUN mvn clean package -DskipTests

# 2. Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /workspace/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://localhost:${PORT:-8080}/api/v1/health" || exit 1

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
