import {
  getComparableModels,
  getComparisonHistory,
} from "@/lib/actions/model-comparisons.actions";
import ModelComparisonWorkspace from "@/components/compare/ModelComparisonWorkspace";

export default async function CompareModelsPage() {
  const [models, history] = await Promise.all([
    getComparableModels({ sort: "popularity" }),
    getComparisonHistory(),
  ]);

  return (
    <ModelComparisonWorkspace
      title="Compare Models"
      description="Run the same prompt across multiple marketplace models and compare cost, latency, output quality, and reliability in one workspace."
      initialModels={models}
      initialHistory={history}
    />
  );
}
