package com.heyganba;

import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.servlet.view.xslt.XsltView;
import org.springframework.web.servlet.view.xslt.XsltViewResolver;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.WildcardType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Keep the API-only MVC surface while view-rendering advisories are excepted in the dependency audit. */
class MvcViewSurfaceTest extends ContentApiTestBase {
    private static final Set<String> SSE_OR_VIEW_TYPES = Set.of(
            "SseEmitter",
            "ResponseBodyEmitter",
            "ServerSentEvent",
            "ModelAndView",
            "FragmentsRendering",
            "Fragment"
    );
    private static final List<String> SSE_OR_VIEW_SOURCE_MARKERS = List.of(
            "SseEmitter",
            "ResponseBodyEmitter",
            "ServerSentEvent",
            "ModelAndView",
            "FragmentsRendering",
            "Fragment",
            "TEXT_EVENT_STREAM",
            "text/event-stream"
    );

    @Autowired ApplicationContext context;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping;

    @Test void applicationDoesNotEnableXsltViews() {
        assertTrue(context.getBeansOfType(XsltView.class).isEmpty());
        assertTrue(context.getBeansOfType(XsltViewResolver.class).isEmpty());
    }

    @Test void applicationDoesNotExposeSseViewFragmentSurface() {
        var applicationHandlers = handlerMapping.getHandlerMethods().entrySet().stream()
                .filter(entry -> entry.getValue().getBeanType().getName().startsWith("com.heyganba."))
                .toList();
        assertFalse(applicationHandlers.isEmpty(), "Expected to inspect registered HeyGanba MVC handlers");

        applicationHandlers.forEach(entry -> {
            RequestMappingInfo mapping = entry.getKey();
            HandlerMethod handler = entry.getValue();
            String endpoint = mapping + " -> " + handler.getMethod().toGenericString();
            assertTrue(AnnotatedElementUtils.hasAnnotation(handler.getBeanType(), RestController.class),
                    "Application MVC handlers must remain REST APIs; review view rendering before adding: " + endpoint);
            assertFalse(mapping.getProducesCondition().getProducibleMediaTypes().stream()
                            .anyMatch(type -> type.isCompatibleWith(MediaType.TEXT_EVENT_STREAM)),
                    "Application MVC handlers must not produce SSE: " + endpoint);
            assertFalse(containsSseOrViewType(handler.getMethod().getGenericReturnType())
                            || Arrays.stream(handler.getMethod().getGenericParameterTypes())
                            .anyMatch(MvcViewSurfaceTest::containsSseOrViewType),
                    "Application MVC handlers must not expose emitter, SSE, or rendered-view types: " + endpoint);
        });
    }

    @Test void applicationSourceDoesNotAddAnAlternativeSseFragmentPath() throws IOException {
        Path sourceRoot = Path.of("src/main/java");
        List<Path> sourceFiles;
        try (Stream<Path> paths = Files.walk(sourceRoot)) {
            sourceFiles = paths.filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".java"))
                    .toList();
        }
        assertFalse(sourceFiles.isEmpty(), "Expected to inspect HeyGanba production Java source");

        sourceFiles.forEach(path -> {
            String source;
            try {
                source = Files.readString(path);
            } catch (IOException exception) {
                throw new UncheckedIOException(exception);
            }
            SSE_OR_VIEW_SOURCE_MARKERS.forEach(marker -> assertFalse(source.contains(marker),
                    "Review the SSE/view-fragment audit exception before adding '" + marker + "' to " + path));
        });
    }

    private static boolean containsSseOrViewType(Type type) {
        if (type instanceof Class<?> rawType) {
            return SSE_OR_VIEW_TYPES.contains(rawType.getSimpleName());
        }
        if (type instanceof ParameterizedType parameterizedType) {
            if (containsSseOrViewType(parameterizedType.getRawType())) return true;
            return Arrays.stream(parameterizedType.getActualTypeArguments())
                    .anyMatch(MvcViewSurfaceTest::containsSseOrViewType);
        }
        if (type instanceof GenericArrayType arrayType) {
            return containsSseOrViewType(arrayType.getGenericComponentType());
        }
        if (type instanceof WildcardType wildcardType) {
            return Arrays.stream(wildcardType.getUpperBounds()).anyMatch(MvcViewSurfaceTest::containsSseOrViewType)
                    || Arrays.stream(wildcardType.getLowerBounds()).anyMatch(MvcViewSurfaceTest::containsSseOrViewType);
        }
        return SSE_OR_VIEW_TYPES.contains(type.getTypeName().substring(type.getTypeName().lastIndexOf('.') + 1));
    }
}
