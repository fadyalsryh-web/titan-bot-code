const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');
const express = require('express');
const app = express();

// كود تشغيل البوت 24 ساعة دون انقطاع
app.get('/', (req, res) => res.send('Titan Bot is Online 24/7!'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// تخزين مؤقت للرتب المسحوبة بسبب السجن
const savedMembersData = new Map();

client.once('ready', async () => {
    try {
        // تسجيل ومزامنة الـ 6 أوامر المائلة باللغة العربية في الديسكورد
        await client.application.commands.set([
            {
                name: 'تقييم',
                description: 'نظام التقييم والترقية الذكي للعضو برسم الإمبيد الفخم',
                options: [{ name: 'member', type: 6, description: 'اختر الشخص الذي تريد ترقيته وتقييمه', required: true }]
            },
            {
                name: 'سجن',
                description: 'سحب رتب العضو وحبسه في روم السجن',
                options: [{ name: 'member', type: 6, description: 'اختر الشخص المراد سجنه', required: true }]
            },
            {
                name: 'فك_سجن',
                description: 'إخراج العضو من السجن وإرجاع رتبه السابقة',
                options: [{ name: 'member', type: 6, description: 'اختر الشخص المراد فك سجنه', required: true }]
            },
            {
                name: 'كتم',
                description: 'كتم العضو ذكياً في كل الرومات (يشوف بس ما يكتب) بدون رتبة',
                options: [{ name: 'member', type: 6, description: 'اختر الشخص المراد كتمه', required: true }]
            },
            {
                name: 'فك_كتم',
                description: 'إزالة الكتم الذكي عن العضو وإرجاع صلاحية الكتابة له',
                options: [{ name: 'member', type: 6, description: 'اختر الشخص المراد فك كتمه', required: true }]
            },
            {
                name: 'تحذير',
                description: 'إضافة أو إزالة رتبة التحذير من العضو',
                options: [{ name: 'member', type: 6, description: 'اختر الشخص المُراد تحذيره أو تعديل إنذاراته', required: true }]
            }
        ]);
        console.log('تمت مزامنة الـ 6 أوامر المائلة بنجاح باللغة العربية!');
    } catch (error) {
        console.error('فشلت مزامنة الأوامر:', error);
    }
    console.log(`البوت جاهز وشغال 24 ساعة باسم: ${client.user.tag}`);
});

function getRoleByScore(score) {
    if (score === 1 || score === 2) return "🟢 龍 Rank E";
    if (score === 3 || score === 4) return "🟠 龍 Rank B";
    if (score === 5 || score === 6) return "🔵 龍 Rank D";
    if (score === 7 || score === 8) return "🟡 龍 Rank C";
    if (score === 9) return "🟣 龍 Rank A";
    if (score === 10) return "🔴 龍 Rank S";
    return null;
}

async function getOrCreateRole(guild, roleName) {
    let role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
        try {
            role = await guild.roles.create({ name: roleName, permissions: [], reason: 'رتبة تلقائية للبوت' });
        } catch (err) { console.error(err); }
    }
    return role;
}

async function putInJail(interaction, member) {
    const jailRole = await getOrCreateRole(interaction.guild, "مسجون");
    if (!jailRole) return interaction.followUp({ content: "❌ فشل جلب أو إنشاء رتبة `مسجون`!", ephemeral: true });
    const oldRoles = member.roles.cache.filter(r => r.id !== interaction.guild.id && !r.managed);
    savedMembersData.set(`jail_${member.id}`, oldRoles);
    try {
        await member.roles.remove(oldRoles);
        await member.roles.add(jailRole);
        await interaction.followUp({ content: `⛓️ تم سحب رتب ${member} وإدخاله السجن تلقائياً لتجاوزه حد التحذيرات!` });
    } catch (err) { await interaction.followUp({ content: "❌ فشل السجن. ارفع رتبة البوت فوق الجميع وفعل خيار مسؤول.", ephemeral: true }); }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

    if (interaction.isCommand()) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: "عذرًا، لا تملك صلاحية `إدارة الرتب` لاستخدام هذا الأمر.", ephemeral: true });
        }

        const member = interaction.options.getMember('member');

        if (interaction.commandName === 'تقييم') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`grade_${member.id}`)
                    .setPlaceholder('اختر التقييم النهائي للعضو (1-10)...')
                    .addOptions([
                        { label: '1', description: '🟢 龍 Rank E', value: '1' }, { label: '2', description: '🟢 龍 Rank E', value: '2' },
                        { label: '3', description: '🟠 龍 Rank B', value: '3' }, { label: '4', description: '🟠 龍 Rank B', value: '4' },
                        { label: '5', description: '🔵 龍 Rank D', value: '5' }, { label: '6', description: '🔵 龍 Rank D', value: '6' },
                        { label: '7', description: '🟡 龍 Rank C', value: '7' }, { label: '8', description: '🟡 龍 Rank C', value: '8' },
                        { label: '9', description: '🟣 龍 Rank A', value: '9' }, { label: '10', description: '🔴 龍 Rank S 🔥', value: '10' }
                    ])
            );
            await interaction.reply({ content: `تم اختيار ${member}. حدد تقييمه النهائي:`, components: [row], ephemeral: true });
        }

        if (interaction.commandName === 'سجن') {
            await interaction.deferReply();
            await putInJail(interaction, member);
        }

        if (interaction.commandName === 'فك_سجن') {
            await interaction.deferReply();
            const jailRole = interaction.guild.roles.cache.find(r => r.name === "مسجون");
            if (member.roles.cache.has(jailRole?.id)) {
                try {
                    await member.roles.remove(jailRole);
                    if (savedMembersData.has(`jail_${member.id}`)) {
                        await member.roles.add(savedMembersData.get(`jail_${member.id}`));
                        savedMembersData.delete(`jail_${member.id}`);
                    }
                    await interaction.followUp({ content: `🔓 تم فك سجن ${member} وإرجاع رتبه السابقة بنجاح!` });
                } catch (err) { await interaction.followUp({ content: "❌ فشل فك السجن.", ephemeral: true }); }
            } else { await interaction.followUp({ content: `العضو ليس في السجن!`, ephemeral: true }); }
        }

        if (interaction.commandName === 'كتم') {
            await interaction.deferReply();
            try {
                const channels = interaction.guild.channels.cache;
                channels.forEach(async (channel) => {
                    if (channel.isTextBased()) {
                        await channel.permissionOverwrites.edit(member, {
                            SendMessages: false,
                            AddReactions: false
                        });
                    }
                });
                await interaction.followUp({ content: `🤐 تم كتم ${member} ذكياً بنجاح! يقدر يشوف رومات السيرفر كاملة بس ما يقدر يكتب ولا حرف أبدًا.` });
            } catch (err) { await interaction.followUp({ content: "❌ فشل الكتم. ارفع رتبة البوت وفعل خيار المسؤول.", ephemeral: true }); }
        }

        if (interaction.commandName === 'فك_كتم') {
            await interaction.deferReply();
            try {
                const channels = interaction.guild.channels.cache;
                channels.forEach(async (channel) => {
                    if (channel.isTextBased()) {
                        const overwrite = channel.permissionOverwrites.cache.get(member.id);
                        if (overwrite) await overwrite.delete();
                    }
                });
                await interaction.followUp({ content: `🔊 تم فك الكتم عن ${member} بنجاح ورجعت له صلاحية الكتابة والدردشة!` });
            } catch (err) { await interaction.followUp({ content: "❌ فشل فك الكتم الذكي.", ephemeral: true }); }
        }

        if (interaction.commandName === 'تحذير') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`warn_add_${member.id}`).setLabel('إضافة تحذير ⚠️').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`warn_rem_${member.id}`).setLabel('إزالة تحذير 🗑️').setStyle(ButtonStyle.Success)
            );
            await interaction.reply({ content: `إدارة تحذيرات ${member.user.username}، اختر الإجراء المطلوب:`, components: [row], ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('grade_')) {
        await interaction.deferUpdate();
        const memberId = interaction.customId.split('_')[1];
        const member = await interaction.guild.members.fetch(memberId);
        const score = parseInt(interaction.values[0]);
        const roleName = getRoleByScore(score);
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return interaction.followUp({ content: `❌ لم أجد رتبة باسم \`${roleName}\`!`, ephemeral: true });
        try {
            await member.roles.add(role);
            const embed = new EmbedBuilder()
                .setTitle('📋 نتيجة التقييم')
                .setColor('#FFD700')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'الشخص', value: `${member}`, inline: false },
