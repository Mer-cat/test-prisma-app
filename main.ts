import { trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from "@opentelemetry/semantic-conventions";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaInstrumentation,
  registerInstrumentations
} from "@prisma/instrumentation";
import { PrismaClient } from "./generated/prisma/client";

const traceExporter = new OTLPTraceExporter();

// Configure the trace provider
const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "example application",
    [ATTR_SERVICE_VERSION]: "0.0.1"
  }),
  spanProcessors: [new SimpleSpanProcessor(traceExporter)]
});

// Register your auto-instrumentors
registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [new PrismaInstrumentation()]
});

// Register the provider globally
provider.register();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` })
});

async function main() {
  trace
    .getTracer("example application")
    .startActiveSpan("main", async (span) => {
      await Promise.all([
        prisma.user.findUnique({ where: { id: "1" } }),
        prisma.post.findUnique({ where: { id: "1" } })
      ]);

      span.end();
    });
}

main();
