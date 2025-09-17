# Compute Module - Single EC2 Instance for AutoFlow-AI
# Simplified architecture without auto-scaling or separate load balancer

# Data source for latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM role for EC2 instance
resource "aws_iam_role" "instance_role" {
  name = "${var.project_name}-${var.environment}-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-instance-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM role policy for CloudWatch logs and basic EC2 operations
resource "aws_iam_role_policy" "instance_policy" {
  name = "${var.project_name}-${var.environment}-instance-policy"
  role = aws_iam_role.instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM instance profile
resource "aws_iam_instance_profile" "instance_profile" {
  name = "${var.project_name}-${var.environment}-instance-profile"
  role = aws_iam_role.instance_role.name

  tags = {
    Name        = "${var.project_name}-${var.environment}-instance-profile"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Single EC2 instance for the application
resource "aws_instance" "main" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids      = [var.security_group_id]
  subnet_id                   = var.subnet_id
  iam_instance_profile        = aws_iam_instance_profile.instance_profile.name
  associate_public_ip_address = var.associate_public_ip

  # User data script for application setup
  user_data = base64encode(templatefile("${path.module}/../../scripts/user_data.sh", {
    project_name      = var.project_name
    environment       = var.environment
    database_url      = var.database_url
    session_secret    = var.session_secret
    react_app_api_url = var.react_app_api_url
    github_repo_url   = "https://github.com/kiranbakale1talentica/AutoFlow-AI.git"
  }))

  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name        = "${var.project_name}-${var.environment}-root-volume"
      Environment = var.environment
      Project     = var.project_name
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-instance"
    Environment = var.environment
    Project     = var.project_name
    Role        = "Application Server"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Attach EC2 instance to ALB target group for frontend
resource "aws_lb_target_group_attachment" "frontend" {
  target_group_arn = var.alb_target_group_frontend_arn
  target_id        = aws_instance.main.id
  port             = 3000
}

# Attach EC2 instance to ALB target group for backend
resource "aws_lb_target_group_attachment" "backend" {
  target_group_arn = var.alb_target_group_backend_arn
  target_id        = aws_instance.main.id
  port             = 5000
}