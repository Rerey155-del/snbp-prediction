export function gaussian(x, mean, variance) {
  // Prevent division by zero
  if (variance === 0) variance = 0.01;

  const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
  const exponent = Math.exp(-Math.pow(x - mean, 2) / (2 * variance));
  return coefficient * exponent;
}

export function naiveBayesPredict(nilai, dataLatih) {
  const kelas = ["LULUS", "TIDAK LULUS"];
  const logProbabilitas = {};
  const stats = {};

  kelas.forEach((k) => {
    // Filter data training berdasarkan kelas
    const subset = dataLatih.filter(
      (d) => d.hasil.toUpperCase() === k.toUpperCase(),
    );

    if (subset.length === 0) {
      logProbabilitas[k] = -Infinity;
      return;
    }

    // Hitung Mean (Rata-rata) secara dinamis
    const nilaiArr = subset.map((d) => Number(d.rata_rata));
    const mean = nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length;

    // Hitung Varians (Populasi) agar lebih sinkron dengan perhitungan manual skripsi
    const variance =
      nilaiArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nilaiArr.length;
    const safeVariance = variance === 0 ? 0.01 : variance;

    // Prior probability (Tetap 0.5 untuk balancing hasil prediksi)
    const prior = 0.5;
    const logPrior = Math.log(prior);

    // Hitung Likelihood menggunakan Gaussian
    const logLikelihood =
      -0.5 * Math.log(2 * Math.PI * safeVariance) -
      Math.pow(nilai - mean, 2) / (2 * safeVariance);

    logProbabilitas[k] = logPrior + logLikelihood;

    // Debug logging untuk verifikasi statistik terbaru
    console.log(`Class: ${k}`);
    console.log(`  Data Count: ${subset.length}`);
    console.log(`  Dynamic Mean: ${mean.toFixed(4)}`);
    console.log(`  Dynamic Variance: ${safeVariance.toFixed(4)}`);
    console.log(`  Log Posterior: ${logProbabilitas[k].toFixed(4)}`);
  });

  console.log("\nFinal Log Probabilities:", logProbabilitas);

  // Return class with highest log probability
  return logProbabilitas["LULUS"] > logProbabilitas["TIDAK LULUS"]
    ? "LULUS"
    : "TIDAK LULUS";
}
