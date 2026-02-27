import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    const scriptPath = join(process.cwd(), "scripts", "scrape_recipe.py")
    const pythonProcess = spawn("python3", [scriptPath, url])

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => { stdout += data.toString() })
    pythonProcess.stderr.on("data", (data) => { stderr += data.toString() })

    const exitCode = await new Promise<number>((resolve) => {
      pythonProcess.on("close", resolve)
    })

    if (exitCode !== 0) {
      console.error("Python script error:", stderr)
      return NextResponse.json({ error: "Failed to scrape recipe. Make sure recipe-scrapers is installed." }, { status: 500 })
    }

    let recipeData
    try {
      recipeData = JSON.parse(stdout)
    } catch {
      return NextResponse.json({ error: "Failed to parse recipe data" }, { status: 500 })
    }

    if (recipeData.error) return NextResponse.json({ error: recipeData.error }, { status: 400 })

    const formattedIngredients = recipeData.ingredients.map((ing: string, index: number) => {
      const parts = ing.trim().split(/\s+/)
      let quantity = "", unit = "", name = ing

      if (parts.length >= 2) {
        const firstPart = parts[0]
        if (/^[\d\/\.]+$/.test(firstPart)) {
          quantity = firstPart
          if (parts.length >= 3) {
            const secondPart = parts[1].toLowerCase()
            const commonUnits = ["cup","cups","tbsp","tablespoon","tablespoons","tsp","teaspoon","teaspoons","oz","ounce","ounces","lb","pound","pounds","g","gram","grams","kg","kilogram","kilograms","ml","milliliter","milliliters","l","liter","liters","piece","pieces","clove","cloves","slice","slices"]
            if (commonUnits.includes(secondPart)) {
              unit = parts[1]
              name = parts.slice(2).join(" ")
            } else {
              name = parts.slice(1).join(" ")
            }
          } else {
            name = parts.slice(1).join(" ")
          }
        }
      }
      return { id: `ing-${index}`, name: name || ing, quantity: quantity || "", unit: unit || "" }
    })

    const tags: string[] = []
    if (recipeData.prepTime) tags.push(String(recipeData.prepTime))
    if (recipeData.cookTime) tags.push(String(recipeData.cookTime))

    return NextResponse.json({
      title: recipeData.title || "Untitled Recipe",
      description: recipeData.description || "",
      prepTime: recipeData.prepTime || "",
      servings: recipeData.servings || 4,
      source: url,
      ingredients: formattedIngredients,
      instructions: recipeData.instructions || [],
      tags: tags.slice(0, 3),
      image: recipeData.image || "",
    })
  } catch (error) {
    console.error("Error scraping recipe:", error)
    return NextResponse.json({ error: "Failed to scrape recipe. Please try again." }, { status: 500 })
  }
}
