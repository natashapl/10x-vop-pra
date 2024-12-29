const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');


function configureS3() {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
  const s3Service = vcapServices['aws-s3']?.[0]?.credentials;

  if (!s3Service) {
      throw new Error('AWS S3 credentials not found in VCAP_SERVICES.');
  }

  return new S3Client({
      region: s3Service.region,
      credentials: {
          accessKeyId: s3Service.access_key_id,
          secretAccessKey: s3Service.secret_access_key,
      },
  });
}

const s3 = configureS3();

async function uploadToS3(bucketName, key, body) {
  const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  await s3.send(command);
  return `https://${bucketName}.s3.${s3.config.region}.amazonaws.com/${key}`;
}

module.exports = async (req, res) => {
  try {
    const formData = req.body;

    // Load Word template
    const templatePath = path.join(__dirname, '../_includes/theme/templates/ICR-Template_A11-Section-280-Clearance-v5-13-24.docx');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at path: ${templatePath}`);
    }
    const templateContent = fs.readFileSync(templatePath, 'binary');

    // Initialize Docxtemplater
    const zip = new PizZip(templateContent);
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

    // Render the template with the provided data
    try {
      doc.render(fieldMapping);
    } catch (error) {
      throw new Error(`Failed to render the document: ${error.message}`);
    }

    // Generate the document as a Buffer
    const documentBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Upload the document to S3
    const fileName = `ICR-Template-${Date.now()}.docx`;
    const fileUrl = await uploadToS3(process.env.S3_BUCKET_NAME, `uploads/${fileName}`, documentBuffer);

    // Respond with the S3 file URL
    res.status(200).send({ fileUrl });
  } catch (error) {
    console.error('Error in generate-word:', error);
    res.status(500).send({ error: 'Failed to generate document.' });
  }
};
