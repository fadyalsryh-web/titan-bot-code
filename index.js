const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Titan Bot is Running 24/7!'));
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

client.once('ready', () => {
    console.log(`تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
});

// مصفوفة مؤقتة لتخزين بيانات الترقية أثناء اختيار العضو
const upgradeCache = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. أمر السجن النصي (تعديل صلاحيات العضو في السيرفر أو الروم)
    if (message.content.startsWith('/سجن')) {
        if (!message.member.permissions.has('ManageRoles')) return message.reply('❌ ليس لديك صلاحية لإدارة الأدوار.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى تحديد العضو (منشن).');
        
        const prisonRole = message.guild.roles.cache.find(r => r.name === 'مسجون');
        if (!prisonRole) return message.reply('❌ لم أجد رتبة باسم "مسجون"، يرجى إنشاؤها أولاً.');
        
        await target.roles.add(prisonRole);
        message.reply(`🔒 تم إرسال ${target} إلى السجن بنجاح.`);
    }

    // 2. أمر فك السجن
    if (message.content.startsWith('/فك سجن')) {
        if (!message.member.permissions.has('ManageRoles')) return message.reply('❌ ليس لديك صلاحية.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى تحديد العضو (منشن).');
        
        const prisonRole = message.guild.roles.cache.find(r => r.name === 'مسجون');
        if (prisonRole) await target.roles.remove(prisonRole);
        message.reply(`🔓 تم فك سجن ${target} بنجاح.`);
    }

    // 3. أمر الكتم (باستخدام ميزة التايم آوت الرسمية من ديسكورد لمدة ساعة)
    if (message.content.startsWith('/كتم')) {
        if (!message.member.permissions.has('ModerateMembers')) return message.reply('❌ ليس لديك صلاحية الكتم.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى تحديد العضو (منشن).');
        
        await target.timeout(60 * 60 * 1000, 'تم الكتم بواسطة البوت');
        message.reply(`🔇 تم كتم ${target} لمدة ساعة.`);
    }

    // 4. أمر فك الكتم
    if (message.content.startsWith('/فك كتم')) {
        if (!message.member.permissions.has('ModerateMembers')) return message.reply('❌ ليس لديك صلاحية.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى تحديد العضو (منشن).');
        
        await target.timeout(null);
        message.reply(`🔊 تم فك كتم ${target} بنجاح.`);
    }

    // 5. أمر الترقية المطور
    if (message.content.startsWith('+ترقية')) {
        if (!message.member.permissions.has('ManageRoles')) return message.reply('❌ ليس لديك صلاحية الترقية.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى عمل منشن للشخص المراد ترقيته بعد الأمر.');

        // حفظ العضو المستهدف في الذاكرة المؤقتة لربطه بالزر لاحقاً
        upgradeCache.set(message.author.id, target.id);

        // جلب جميع رتب السيرفر لإنشاء أزرار لها (سنأخذ أول 5 رتب كمثال لتجنب تخطي حد الأزرار)
        const roles = message.guild.roles.cache.filter(r => r.name !== '@everyone' && !r.managed).take(5);
        const row = new ActionRowBuilder();

        roles.forEach(role => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`promote_${role.id}`)
                    .setLabel(`رتبة: ${role.name}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        if (row.components.length === 0) return message.reply('❌ لم أجد رتباً كافية في السيرفر لإنشاء الأزرار.');

        message.reply({ content: `الآن اختر الرتبة التي تود منحها لـ ${target}:`, components: [row] });
    }

    // 6. أمر التقييم (يفتح النموذج السري زي الصورة)
    if (message.content.startsWith('+تقييم')) {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى عمل منشن للشخص المراد تقييمه.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`open_eval_modal_${target.id}`)
                .setLabel('📋 فتح النموذج')
                .setStyle(ButtonStyle.Success)
        );

        message.reply({ content: `لتقييم العضو ${target}، اضغط على الزر أدناه:`, components: [row] });
    }
});

// التعامل مع ضغطات الأزرار والنماذج (Interactions)
client.on('interactionCreate', async (interaction) => {
    // التعامل مع أزرار الترقية
    if (interaction.isButton() && interaction.customId.startsWith('promote_')) {
        const roleId = interaction.customId.split('_')[1];
        const targetId = upgradeCache.get(interaction.user.id);
        
        if (!targetId) return interaction.reply({ content: '❌ انتهت صلاحية الجلسة، يرجى كتابة الأمر +ترقية مجدداً.', ephemeral: true });
        
        const member = await interaction.guild.members.fetch(targetId);
        const role = interaction.guild.roles.cache.get(roleId);

        if (member && role) {
            await member.roles.add(role);
            await interaction.update({ content: `✅ تم منح رتبة **${role.name}** للعضو ${member} بنجاح!`, components: [] });
            upgradeCache.delete(interaction.user.id);
        } else {
            interaction.reply({ content: '❌ حدث خطأ في العثور على العضو أو الرتبة.', ephemeral: true });
        }
    }

    // التعامل مع زر فتح نموذج التقييم
    if (interaction.isButton() && interaction.customId.startsWith('open_eval_modal_')) {
        const targetId = interaction.customId.split('_')[2];

        const modal = new ModalBuilder()
            .setCustomId(`eval_modal_${targetId}`)
            .setTitle('📋 نموذج تقييم العضو');

        const blockInput = new TextInputBuilder().setCustomId('block').setLabel('البلوك (من 10)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5);
        const speedInput = new TextInputBuilder().setCustomId('speed').setLabel('السرعة (من 10)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5);
        const comboInput = new TextInputBuilder().setCustomId('combo').setLabel('الكومبو (من 10)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5);
        const iqInput = new TextInputBuilder().setCustomId('iq').setLabel('الذكاء في اللعب (من 10)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5);
        const rankInput = new TextInputBuilder().setCustomId('rank').setLabel('الرتبة المستحقة (مثال: Rank S)').setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(blockInput),
            new ActionRowBuilder().addComponents(speedInput),
            new ActionRowBuilder().addComponents(comboInput),
            new ActionRowBuilder().addComponents(iqInput),
            new ActionRowBuilder().addComponents(rankInput)
        );

        await interaction.showModal(modal);
    }

    // استقبال وإرسال نتيجة التقييم بعد تعبئة النموذج
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('eval_modal_')) {
        const targetId = interaction.customId.split('_')[2];
        const targetMember = await interaction.guild.members.fetch(targetId);

        const block = interaction.fields.getTextInputValue('block');
        const speed = interaction.fields.getTextInputValue('speed');
        const combo = interaction.fields.getTextInputValue('combo');
        const iq = interaction.fields.getTextInputValue('iq');
        const rank = interaction.fields.getTextInputValue('rank');

        // حساب التقييم النهائي تلقائياً (افتراضاً أنه متوسط العلامات الأربعة)
        const finalScore = ((parseFloat(block) || 0) + (parseFloat(speed) || 0) + (parseFloat(combo) || 0) + (parseFloat(iq) || 0)) / 4;

        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('📋 نتيجة التقييم')
            .setThumbnail(targetMember.user.displayAvatarURL())
            .addFields(
                { name: 'الشخص', value: `${targetMember}`, inline: false },
                { name: '🛡️ البلوك', value: `${block}/10`, inline: true },
                { name: '⚡ السرعة', value: `${speed}/10`, inline: true },
                { name: '🔥 الكومبو', value: `${combo}/10`, inline: true },
                { name: '🧠 الذكاء في اللعب', value: `${iq}/10`, inline: true },
                { name: 'التقييم النهائي', value: `${finalScore.toFixed(1)}/10`, inline: false },
                { name: 'الرتبة المستحقة', value: `🔴 ${rank}`, inline: false }
            )
            .setFooter({ text: `تم التقييم بواسطة: ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
