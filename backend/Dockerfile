# ==========================================
# Multi-stage Dockerfile for HeyGanba Backend
# ==========================================

# 1. Build Stage
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /workspace

# Install Maven. The package goal below resolves only dependencies used by this application.
RUN apk add --no-cache maven

# Copy source code and build
COPY pom.xml .
COPY src src
RUN mvn clean package -DskipTests

# 2. Runtime Stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Free tier Render chỉ có 512MB RAM: JVM mặc định chỉ lấy 25% (~128MB heap) → Spring Boot + Hibernate
# khởi động rất chậm hoặc bị OOM. Nâng lên 75% (~384MB) để start ổn định.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /workspace/target/*.jar app.jar

# Render tự set PORT (mặc định 10000) và route traffic vào port đó → KHÔNG hardcode ENV PORT ở đây,
# app đọc `server.port: ${PORT:8080}` (application.yml). Local docker-compose dùng 8080.
EXPOSE 10000

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
