# GIS Education Dashboard

**A comprehensive curriculum-aligned geospatial data portal for UAE and MENA education**

## Overview

This dashboard serves as a foundational resource hub for educators and students across the UAE and MENA region, providing pre-made, curriculum-ready GIS materials that integrate with AP, IB, and GCSE diploma programs.

## Project Goals

### For Educators
- Provide pre-made, curriculum-ready GIS materials for immediate classroom integration
- Support three major diploma programs: AP (Advanced Placement), IB (International Baccalaureate), and GCSE
- Enable teachers without extensive GIS backgrounds to incorporate spatial thinking into their subjects

### For Students
- Offer curated datasets specifically relevant to UAE and MENA contexts
- Connect academic concepts from international curricula to local and regional geography
- Provide hands-on GIS analysis opportunities using familiar, locally-relevant data

### Strategic Vision
Transform how students understand their region by applying international academic frameworks to UAE and MENA geography, fostering a generation of spatial thinkers who can contribute to intelligent regional development.

## Features

### 📚 **83 Courses Available**
- **AP**: 5 curated high-GIS-potential courses (+ 30 more in database)
- **IB**: 5 curated courses across Individuals & Societies and Sciences
- **GCSE**: 4 curated courses in Humanities and Social Sciences

### ⭐ **GIS Potential Indicators**
- **High (★)**: Courses with strong spatial analysis components
- **Medium**: Courses with moderate GIS integration opportunities
- **Low**: Courses with limited but possible GIS applications

### 🌍 **Regional Focus**
All datasets and examples are contextualized for:
- United Arab Emirates (UAE)
- Middle East and North Africa (MENA) region
- Gulf Cooperation Council (GCC) countries

### 📊 **Data Variables**
15 pre-selected data categories:
- Demographics (Population, Age, Households)
- Socioeconomic (Income, Education, Employment)
- Infrastructure (Housing, Business, Retail)
- Behavioral (Spending, Behaviors, Marital Status)

## File Structure

```
GIS Curriculum/
├── homepage.HTML                    # Main dashboard interface (enhanced UI)
├── dashboard.js                     # Dynamic curriculum loader
├── curated_curriculum_data.json    # Curated course database
├── curriculum_data.json            # Full extracted data (83 courses)
├── extract_curriculum.py           # PDF extraction script
├── generate_dashboard_js.py        # JavaScript generator
├── extraction_report.txt           # Processing summary
├── curriculum_extraction.log       # Detailed extraction log
├── AP/                             # 35 AP course PDFs
├── GCSE/                           # 15 GCSE course PDFs
└── International Baccalaureate/    # 33 IB course PDFs
```

## Technology Stack

### Frontend
- **HTML5** with semantic markup
- **CSS3** with modern gradient design and responsive layout
- **Vanilla JavaScript** for dynamic content loading

### Backend Processing
- **Python 3** for curriculum extraction
- **PyPDF2** with PyCryptodome for encrypted PDF support
- **JSON** for structured data storage

## Setup & Usage

### Prerequisites
```bash
pip install PyPDF2 pycryptodome
```

### Running the Dashboard
1. **Start a local server:**
   ```bash
   cd "/Users/paulstrootman/Documents/GIS Curriculum"
   python3 -m http.server 8000
   ```

2. **Open in browser:**
   ```
   http://localhost:8000/homepage.HTML
   ```

3. **Use the dashboard:**
   - Select diploma program (AP, IB, or GCSE)
   - Choose a course (★ indicates high GIS potential)
   - Select relevant units and topics
   - Pick data variables for your analysis
   - Download your customized GIS data package

## Curriculum Extraction Pipeline

### Phase 1: PDF Processing
```bash
python3 extract_curriculum.py
```
- Scans 83 PDFs across three diploma programs
- Extracts course titles, units, and topics
- Handles encrypted PDFs with PyCryptodome
- Outputs `curriculum_data.json`

### Phase 2: Curation
- Manual refinement of high-GIS-potential courses
- Addition of detailed unit structures
- UAE/MENA contextualization
- Results in `curated_curriculum_data.json`

### Phase 3: Dashboard Generation
```bash
python3 generate_dashboard_js.py
```
- Converts JSON to JavaScript
- Creates dynamic course loader
- Generates `dashboard.js`

### Phase 4: Integration
- Enhanced HTML with modern UI
- Responsive CSS design
- Dynamic content population
- Interactive unit selection

## High GIS Potential Courses

### AP (Advanced Placement)
1. **AP Human Geography** ⭐⭐⭐
   - 7 units covering spatial thinking, population, culture, politics, agriculture, urbanization, and development
   - Direct application to UAE's rapid urbanization and demographic changes

2. **AP World History: Modern** ⭐⭐
   - 9 units exploring global trade networks, empires, and globalization
   - Connections to UAE's position in historical trade routes

3. **AP Environmental Science** ⭐⭐⭐
   - 9 units on ecosystems, populations, earth systems, and global change
   - Highly relevant to UAE's environmental challenges and sustainability initiatives

### IB (International Baccalaureate)
1. **Geography** ⭐⭐⭐
   - Changing populations, climate vulnerability, resource security
   - Direct UAE and MENA applications

2. **Environmental Systems and Societies** ⭐⭐⭐
   - 8 units covering ecosystems, water, soil, atmosphere, and climate
   - Critical for understanding UAE's environmental context

3. **Global Politics** ⭐⭐⭐
   - Power, sovereignty, development, and conflict
   - Highly relevant to MENA geopolitical dynamics

### GCSE
1. **Geography** ⭐⭐⭐
   - Physical and human environments
   - Direct UK curriculum but adaptable to UAE contexts

2. **Economics** ⭐⭐
   - Global economy focus with spatial dimensions
   - Relevant to UAE's economic diversification

## Data Package Contents (Future Implementation)

Each download will include:
- **Shapefiles** for selected regions (UAE, GCC, MENA)
- **Attribute tables** with selected variables
- **Metadata** with data sources and descriptions
- **Quick start guide** for ArcGIS Online
- **Lesson plan templates** aligned with selected units

## Extensibility

### Adding New Courses
1. Add PDF to appropriate diploma folder
2. Run `extract_curriculum.py`
3. Manually curate in `curated_curriculum_data.json`
4. Regenerate JavaScript: `python3 generate_dashboard_js.py`

### Adding New Data Variables
1. Edit `homepage.HTML` data variables section
2. Update backend data collection (future)
3. Ensure UAE/MENA regional data availability

### Customizing for Other Regions
1. Replace regional context in `curated_curriculum_data.json`
2. Update data sources and variables
3. Modify info banner and legend text
4. Adjust download handler for regional shapefiles

## Course Statistics

| Program | Total Courses | High GIS Potential | Percentage |
|---------|---------------|-------------------|------------|
| AP      | 35            | 5                 | 14%        |
| IB      | 33            | 5                 | 15%        |
| GCSE    | 15            | 4                 | 27%        |
| **Total** | **83**      | **14**            | **17%**    |

## Development Process

### Extraction Results
- **Total PDFs Processed**: 83
- **Successful**: 83 (100%)
- **Failed**: 0
- **Processing Time**: ~5 seconds

### Challenges Solved
1. ✅ Encrypted AP PDFs (solved with PyCryptodome)
2. ✅ Varying PDF structures across curricula
3. ✅ Unit extraction from different formatting styles
4. ✅ Dynamic JavaScript generation from JSON
5. ✅ Responsive UI for 83 courses

## Future Enhancements

### Phase 1 (Current)
- ✅ Dashboard UI
- ✅ Course selection
- ✅ Unit browsing
- ✅ Data variable selection

### Phase 2 (Next Steps)
- [ ] Backend shapefile generation
- [ ] ArcGIS Online integration
- [ ] Real data variable linking
- [ ] User accounts and saved projects

### Phase 3 (Advanced)
- [ ] Interactive map preview
- [ ] Custom area selection
- [ ] Time series data
- [ ] Lesson plan generator
- [ ] Student project gallery

## Educational Impact

This dashboard addresses critical barriers to GIS adoption in UAE schools:

1. **Time**: Pre-made materials save educators hours of preparation
2. **Expertise**: No extensive GIS background required
3. **Relevance**: All data contextualized to students' lived geography
4. **Standards**: Aligned with AP/IB/GCSE curriculum requirements
5. **Access**: Free, web-based, no software installation needed

## Support & Contact

For questions, suggestions, or contributions:
- **Project**: GIS Education Dashboard
- **Region**: UAE & MENA
- **Curriculum**: AP, IB, GCSE aligned

## License

This educational resource is designed for non-commercial educational use in UAE and MENA schools.

---

**Built with ❤️ for spatial thinkers across the UAE and MENA region**

*Transforming curriculum into geographic understanding*
