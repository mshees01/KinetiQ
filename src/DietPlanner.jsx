import { useState } from "react";

// ─── HELPERS ────────────────────────────────────────────────────────
function calcBMI(weight, height) {
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: "Underweight", color: "#facc15" };
  if (bmi < 25)   return { label: "Normal",      color: "#10b981" };
  if (bmi < 30)   return { label: "Overweight",  color: "#f97316" };
  return              { label: "Obese",           color: "#ef4444" };
}

// Mifflin-St Jeor BMR (moderate activity × 1.55)
function calcCalories(weight, height, age, gender) {
  const bmr = gender === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round(bmr * 1.55);
}

// ─── MEAL CARD ───────────────────────────────────────────────────────
function MealCard({ meal }) {
  return (
    <div className="dp-meal-card">
      <div className="dp-meal-header">
        <span className="dp-meal-icon">{meal.icon}</span>
        <div>
          <div className="dp-meal-time">{meal.time}</div>
          <div className="dp-meal-name">{meal.name}</div>
        </div>
        <div className="dp-meal-cals">{meal.calories} kcal</div>
      </div>

      <div className="dp-macro-row">
        <div className="dp-macro">
          <span className="dp-macro-val" style={{ color: "#f97316" }}>{meal.protein}g</span>
          <span className="dp-macro-label">Protein</span>
        </div>
        <div className="dp-macro">
          <span className="dp-macro-val" style={{ color: "#3b82f6" }}>{meal.carbs}g</span>
          <span className="dp-macro-label">Carbs</span>
        </div>
        <div className="dp-macro">
          <span className="dp-macro-val" style={{ color: "#facc15" }}>{meal.fats}g</span>
          <span className="dp-macro-label">Fats</span>
        </div>
      </div>

      <div className="dp-foods">
        {meal.foods.map((f, i) => (
          <span key={i} className="dp-food-chip">{f}</span>
        ))}
      </div>

      {meal.tip && (
        <div className="dp-meal-tip">💡 {meal.tip}</div>
      )}
    </div>
  );
}

// ─── DIET PLANNER MAIN ───────────────────────────────────────────────
export default function DietPlanner({ onBack }) {
  const [step, setStep]       = useState("form");   // form | loading | result
  const [error, setError]     = useState(null);
  const [plan, setPlan]       = useState(null);

  const [form, setForm] = useState({
    weight: "", height: "", age: "", gender: "male",
    goal: "maintain", activity: "moderate", diet: "non-veg",
  });

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const bmi      = form.weight && form.height ? calcBMI(+form.weight, +form.height) : null;
  const bmiCat   = bmi ? bmiCategory(+bmi) : null;
  const tdee     = form.weight && form.height && form.age
    ? calcCalories(+form.weight, +form.height, +form.age, form.gender) : null;

  async function generatePlan() {
    setError(null);
    setStep("loading");

    const targetCals = tdee
      ? form.goal === "lose"   ? tdee - 500
      : form.goal === "gain"   ? tdee + 400
      : tdee
      : 2000;

    const prompt = `You are a certified nutritionist. Create a detailed 1-day meal plan for:
- Weight: ${form.weight} kg
- Height: ${form.height} cm
- Age: ${form.age} years
- Gender: ${form.gender}
- BMI: ${bmi} (${bmiCat?.label})
- Goal: ${form.goal === "lose" ? "Weight loss" : form.goal === "gain" ? "Muscle gain" : "Maintain weight"}
- Activity: ${form.activity}
- Diet type: ${form.diet}
- Target calories: ~${targetCals} kcal/day

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "summary": "2-sentence personalised summary for this person",
  "targetCalories": ${targetCals},
  "totalProtein": number,
  "totalCarbs": number,
  "totalFats": number,
  "waterIntake": "X litres",
  "meals": [
    {
      "icon": "emoji",
      "time": "7:00 AM",
      "name": "Breakfast",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number,
      "foods": ["food item 1", "food item 2", "food item 3"],
      "tip": "short cooking or timing tip"
    }
  ]
}
Include 5 meals: Breakfast, Mid-Morning Snack, Lunch, Evening Snack, Dinner.
Use real, practical foods. Be specific with quantities (e.g. "2 boiled eggs", "1 cup oats").`;

    try {
      const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;


      // Aise karo (CORRECT) 
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a certified nutritionist. Always respond with valid JSON only — no markdown, no explanation, no extra text.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data);
        setError(`API Error (${res.status}): ${msg}`);
        setStep("form");
        return;
      }

      const raw     = data?.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed  = JSON.parse(cleaned);
      setPlan(parsed);
      setStep("result");
    } catch (e) {
      setError(`Error: ${e.message}`);
      setStep("form");
    }
  }

  // ── FORM STEP ─────────────────────────────────────────────────────
  if (step === "form") return (
    <div className="dp-page">
      <div className="bg-grid" />
      <div className="dp-content">

        <div className="dp-topbar">
          <button onClick={onBack} className="back-btn">← Back</button>
          <div className="dp-topbar-title">
            <span className="dp-topbar-icon">🥗</span>
            AI Diet Planner
          </div>
        </div>

        <div className="dp-form-wrap">
          <div className="dp-form-header">
            <div className="dp-form-badge">POWERED BY AI</div>
            <h2 className="dp-form-title">Your Personalised<br />Diet Plan</h2>
            <p className="dp-form-sub">Enter your stats and get a full day meal plan in seconds</p>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="dp-fields">

            {/* Row 1 — Weight & Height */}
            <div className="dp-field-row">
              <div className="dp-field">
                <label className="dp-label">Weight</label>
                <div className="dp-input-wrap">
                  <input
                    className="dp-input"
                    type="number" min="30" max="250"
                    placeholder="70"
                    value={form.weight}
                    onChange={e => update("weight", e.target.value)}
                  />
                  <span className="dp-unit">kg</span>
                </div>
              </div>
              <div className="dp-field">
                <label className="dp-label">Height</label>
                <div className="dp-input-wrap">
                  <input
                    className="dp-input"
                    type="number" min="100" max="250"
                    placeholder="175"
                    value={form.height}
                    onChange={e => update("height", e.target.value)}
                  />
                  <span className="dp-unit">cm</span>
                </div>
              </div>
              <div className="dp-field">
                <label className="dp-label">Age</label>
                <div className="dp-input-wrap">
                  <input
                    className="dp-input"
                    type="number" min="10" max="100"
                    placeholder="25"
                    value={form.age}
                    onChange={e => update("age", e.target.value)}
                  />
                  <span className="dp-unit">yrs</span>
                </div>
              </div>
            </div>

            {/* BMI live preview */}
            {bmi && (
              <div className="dp-bmi-bar">
                <span className="dp-bmi-label">BMI</span>
                <span className="dp-bmi-val" style={{ color: bmiCat.color }}>{bmi}</span>
                <span className="dp-bmi-cat" style={{ color: bmiCat.color }}>— {bmiCat.label}</span>
                {tdee && <span className="dp-tdee">· ~{tdee} kcal/day maintenance</span>}
              </div>
            )}

            {/* Row 2 — Gender */}
            <div className="dp-field">
              <label className="dp-label">Gender</label>
              <div className="dp-toggle-row">
                {["male","female"].map(g => (
                  <button
                    key={g}
                    className={`dp-toggle ${form.gender === g ? "dp-toggle-active-" + g : ""}`}
                    onClick={() => update("gender", g)}
                  >
                    {g === "male" ? "♂ Male" : "♀ Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3 — Goal */}
            <div className="dp-field">
              <label className="dp-label">Goal</label>
              <div className="dp-toggle-row">
                {[
                  { v: "lose",     label: "🔥 Lose Weight" },
                  { v: "maintain", label: "⚖️ Maintain"    },
                  { v: "gain",     label: "💪 Gain Muscle" },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    className={`dp-toggle ${form.goal === v ? "dp-toggle-active-goal" : ""}`}
                    onClick={() => update("goal", v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4 — Activity */}
            <div className="dp-field">
              <label className="dp-label">Activity Level</label>
              <div className="dp-toggle-row dp-toggle-wrap">
                {[
                  { v: "sedentary",  label: "🛋 Sedentary"   },
                  { v: "light",      label: "🚶 Light"        },
                  { v: "moderate",   label: "🏃 Moderate"     },
                  { v: "active",     label: "⚡ Very Active"  },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    className={`dp-toggle ${form.activity === v ? "dp-toggle-active-goal" : ""}`}
                    onClick={() => update("activity", v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 5 — Diet type */}
            <div className="dp-field">
              <label className="dp-label">Diet Preference</label>
              <div className="dp-toggle-row dp-toggle-wrap">
                {[
                  { v: "non-veg",   label: "🍗 Non-Veg"   },
                  { v: "veg",       label: "🥦 Vegetarian" },
                  { v: "vegan",     label: "🌱 Vegan"      },
                  { v: "keto",      label: "🥑 Keto"       },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    className={`dp-toggle ${form.diet === v ? "dp-toggle-active-goal" : ""}`}
                    onClick={() => update("diet", v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            className="dp-generate-btn"
            onClick={generatePlan}
            disabled={!form.weight || !form.height || !form.age}
          >
            🥗 Generate My Diet Plan
          </button>
        </div>
      </div>
    </div>
  );

  // ── LOADING STEP ──────────────────────────────────────────────────
  if (step === "loading") return (
    <div className="dp-page dp-loading-page">
      <div className="bg-grid" />
      <div className="dp-loading-wrap">
        <div className="dp-loading-spinner" />
        <div className="dp-loading-title">Analysing your stats...</div>
        <div className="dp-loading-steps">
          <div className="dp-lstep">📊 Calculating BMI & TDEE</div>
          <div className="dp-lstep">🧠 AI generating your meals</div>
          <div className="dp-lstep">⚖️ Balancing macros</div>
          <div className="dp-lstep">✅ Finalising your plan</div>
        </div>
      </div>
    </div>
  );

  // ── RESULT STEP ───────────────────────────────────────────────────
  const bmiResult  = calcBMI(+form.weight, +form.height);
  const bmiCatRes  = bmiCategory(+bmiResult);

  return (
    <div className="dp-page">
      <div className="bg-grid" />
      <div className="dp-content dp-result-content">

        <div className="dp-topbar">
          <button onClick={onBack} className="back-btn">← Home</button>
          <div className="dp-topbar-title">
            <span className="dp-topbar-icon">🥗</span>
            Your Diet Plan
          </div>
          <button className="dp-redo-btn" onClick={() => { setPlan(null); setStep("form"); }}>
            ↩ Redo
          </button>
        </div>

        {/* ── Stats Banner ── */}
        <div className="dp-stats-banner">
          <div className="dp-stat-pill">
            <span className="dp-sp-label">WEIGHT</span>
            <span className="dp-sp-val">{form.weight} kg</span>
          </div>
          <div className="dp-stat-pill">
            <span className="dp-sp-label">HEIGHT</span>
            <span className="dp-sp-val">{form.height} cm</span>
          </div>
          <div className="dp-stat-pill">
            <span className="dp-sp-label">BMI</span>
            <span className="dp-sp-val" style={{ color: bmiCatRes.color }}>{bmiResult} · {bmiCatRes.label}</span>
          </div>
          <div className="dp-stat-pill">
            <span className="dp-sp-label">TARGET</span>
            <span className="dp-sp-val" style={{ color: "#00e5ff" }}>{plan.targetCalories} kcal</span>
          </div>
          <div className="dp-stat-pill">
            <span className="dp-sp-label">WATER</span>
            <span className="dp-sp-val" style={{ color: "#3b82f6" }}>💧 {plan.waterIntake}</span>
          </div>
        </div>

        {/* ── AI Summary ── */}
        <div className="dp-summary-box">
          <span className="dp-summary-icon">🤖</span>
          <p className="dp-summary-text">{plan.summary}</p>
        </div>

        {/* ── Daily Macros ── */}
        <div className="dp-macro-overview">
          <div className="dp-macro-card" style={{ borderColor: "#f97316" }}>
            <div className="dp-mc-val" style={{ color: "#f97316" }}>{plan.totalProtein}g</div>
            <div className="dp-mc-label">Total Protein</div>
          </div>
          <div className="dp-macro-card" style={{ borderColor: "#3b82f6" }}>
            <div className="dp-mc-val" style={{ color: "#3b82f6" }}>{plan.totalCarbs}g</div>
            <div className="dp-mc-label">Total Carbs</div>
          </div>
          <div className="dp-macro-card" style={{ borderColor: "#facc15" }}>
            <div className="dp-mc-val" style={{ color: "#facc15" }}>{plan.totalFats}g</div>
            <div className="dp-mc-label">Total Fats</div>
          </div>
          <div className="dp-macro-card" style={{ borderColor: "#00e5ff" }}>
            <div className="dp-mc-val" style={{ color: "#00e5ff" }}>{plan.targetCalories}</div>
            <div className="dp-mc-label">Total Calories</div>
          </div>
        </div>

        {/* ── Meals ── */}
        <div className="dp-meals-section">
          <h3 className="dp-meals-title">📅 Today's Meal Plan</h3>
          <div className="dp-meals-grid">
            {plan.meals.map((meal, i) => (
              <MealCard key={i} meal={meal} />
            ))}
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="dp-disclaimer">
          ⚠️ This plan is AI-generated for informational purposes only. Consult a registered dietitian before making significant dietary changes.
        </div>

      </div>
    </div>
  );
}