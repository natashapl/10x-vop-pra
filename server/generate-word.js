const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const AWS = require('aws-sdk');

// Configure AWS S3 using VCAP_SERVICES
function configureS3() {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
  const s3Service = vcapServices['aws-s3']?.[0]?.credentials;

  if (!s3Service) {
    throw new Error('AWS S3 credentials not found in VCAP_SERVICES.');
  }

  return new AWS.S3({
    accessKeyId: s3Service.access_key_id,
    secretAccessKey: s3Service.secret_access_key,
    region: s3Service.region,
  });
}

// Initialize S3 client
const s3 = configureS3();

module.exports = async (req, res) => {
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

    // Generate the document as a Buffer
    const documentBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Define S3 upload parameters
    const bucketName = process.env.AWS_S3_BUCKET || s3Service.bucket;
    const fileName = `generated-${Date.now()}.docx`;
    const s3Params = {
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      Body: documentBuffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    // Upload to S3
    const uploadResult = await s3.upload(s3Params).promise();

    // Respond with the S3 file URL
    res.status(200).send({ fileUrl: uploadResult.Location });
  } catch (error) {
    console.error('Error in generate-word:', error);
    res.status(500).send({ error: 'Failed to generate document.' });
  }
};
