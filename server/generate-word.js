const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

module.exports = (req, res) => {
  try {
    const formData = req.body;

    // Correct template path
    const templatePath = path.join(__dirname, '../_includes/theme/templates/ICR-Template_A11-Section-280-Clearance-v5-13-24.docx');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at path: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Map form data to template placeholders
    const fieldMapping = {
      title: formData.title || '',
      purpose: formData.purpose || '',
      customerResearch: formData.customerResearch || '',
      customerFeedback: formData.customerFeedback || '',
      usabilityTesting: formData.usabilityTesting || '',
      surveyResultsYes: formData.surveyResultsYes || '',
      surveyResultsNo: formData.surveyResultsNo || '',
      notASurvey: formData.notASurvey || '',
      webBased: formData.webBased || '',
      telephone: formData.telephone || '',
      inPerson: formData.inPerson || '',
      mail: formData.mail || '',
      other: formData.other || '',
      collectInfoFrom: formData.collectInfoFrom || '',
      respondentProvideInfo: formData.respondentProvideInfo || '',
      activityLookLike: formData.activityLookLike || '',
      questionList: formData.questionList || '',
      activityTiming: formData.activityTiming || '',
      incentiveYes: formData.incentiveYes || '',
      incentiveNo: formData.incentiveNo || '',
      incentiveDescription: formData.incentiveDescription || '',
      burdenEstimates: formData.burdenEstimates || [],
      totalNumberOfRespondents: formData.totalNumberOfRespondents || 0,
      totalParticipationTime: formData.totalParticipationTime || 0,
      totalAnnualBurdenHours: formData.totalAnnualBurdenHours || 0,
      name: formData.name || '',
      email: formData.email || '',
    };

    try {
      doc.render(fieldMapping);
    } catch (error) {
      throw new Error(`Failed to render the document: ${error.message}`);
    }

    // Save the generated Word document
    const uploadsPath = path.join(__dirname, '../_site/uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    const fileName = `generated-${Date.now()}.docx`;
    const filePath = path.join(uploadsPath, fileName);
    fs.writeFileSync(filePath, doc.getZip().generate({ type: 'nodebuffer' }));

    // Respond with the public URL of the generated file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
    res.status(200).send({ fileUrl });
  } catch (error) {
    console.error('Error in generate-word:', error);
    res.status(500).send({ error: 'Failed to generate document.' });
  }
};