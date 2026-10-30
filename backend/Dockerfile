FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
RUN apk add --no-cache maven
COPY pom.xml .
COPY src src
RUN mvn -B package -DskipTests
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S jiayou && adduser -S jiayou -G jiayou
RUN apk add --no-cache curl
USER jiayou
COPY --from=build /workspace/target/jiayou-backend-0.0.1-SNAPSHOT.jar app.jar
# Container port only; host bindings and JVM budgets are operator-owned.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
